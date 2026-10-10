"""Decode 'snd ' resources (format 1/2; standard, extended and IMA4-compressed headers) to PCM."""
import struct

IMA_STEPS = [
    7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80,
    88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544,
    598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749,
    3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635,
    13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767]
IMA_INDEX = [-1, -1, -1, -1, 2, 4, 6, 8]


def _ima4_packet(pkt, state):
    """Apple IMA4: 34-byte packet -> 64 signed 16-bit samples.

    The header stores the predictor's top 9 bits and the step index. Like Apple's decoder,
    the running full-precision predictor is kept when the header agrees with it (same step
    index and within 0x7F); otherwise the decoder resynchronises to the header.
    """
    hdr = struct.unpack('>H', pkt[:2])[0]
    hpred = hdr & 0xFF80
    if hpred & 0x8000:
        hpred -= 0x10000
    hidx = min(hdr & 0x7F, 88)
    if state and state[1] == hidx and abs(hpred - state[0]) <= 0x7F:
        pred, idx = state
    else:
        pred, idx = hpred, hidx
    out = []
    for byte in pkt[2:34]:
        for nib in (byte & 0x0F, byte >> 4):
            step = IMA_STEPS[idx]
            diff = step >> 3
            if nib & 1:
                diff += step >> 2
            if nib & 2:
                diff += step >> 1
            if nib & 4:
                diff += step
            if nib & 8:
                pred -= diff
            else:
                pred += diff
            pred = max(-32768, min(32767, pred))
            idx = min(max(idx + IMA_INDEX[nib & 7], 0), 88)
            out.append(pred)
    state[:] = [pred, idx]
    return out


def _ext80(b):
    exp, mant = struct.unpack('>HQ', b)
    sign = -1 if exp & 0x8000 else 1
    exp &= 0x7FFF
    if exp == 0 and mant == 0:
        return 0.0
    return sign * mant * 2.0 ** (exp - 16383 - 63)


def decode(blob):
    """Return dict(rate=float, channels=int, bits=8|16, data=bytes) with little-endian 16-bit or
    unsigned 8-bit interleaved PCM (WAV conventions)."""
    fmt = struct.unpack('>h', blob[:2])[0]
    p = 2
    if fmt == 1:
        ndf = struct.unpack('>h', blob[p:p + 2])[0]
        p += 2 + ndf * 6
    elif fmt == 2:
        p += 2
    else:
        raise ValueError('snd format %d' % fmt)
    ncmd = struct.unpack('>h', blob[p:p + 2])[0]
    p += 2
    h = None
    for _ in range(ncmd):
        cmd, _p1, p2 = struct.unpack('>HhI', blob[p:p + 8])
        p += 8
        if cmd & 0x7FFF in (0x50, 0x51):
            h = p2
    if h is None:
        raise ValueError('no sound/buffer command')
    _ptr, length, rate_fixed, _ls, _le, enc, _base = struct.unpack('>IIIIIBB', blob[h:h + 22])
    rate = rate_fixed / 65536.0
    if enc == 0x00:  # standard header: 8-bit mono, offset binary
        return dict(rate=rate, channels=1, bits=8, data=blob[h + 22:h + 22 + length])
    nch = length
    nframes = struct.unpack('>I', blob[h + 22:h + 26])[0]
    if enc == 0xFF:  # extended header
        bits = struct.unpack('>h', blob[h + 48:h + 50])[0]
        data = blob[h + 64:h + 64 + nframes * nch * bits // 8]
        if bits == 16:
            data = b''.join(data[i + 1:i + 2] + data[i:i + 1] for i in range(0, len(data), 2))
        return dict(rate=rate, channels=nch, bits=bits, data=data)
    if enc == 0xFE:  # compressed header
        fourcc = blob[h + 40:h + 44]
        if fourcc != b'ima4':
            raise ValueError('codec %r' % fourcc)
        # The Sound Manager plays at the Fixed sampleRate; the AIFF extended copy agrees.
        assert abs(_ext80(blob[h + 26:h + 36]) - rate) < 0.01
        pk = blob[h + 64:]
        samples, states = [], [[] for _ in range(nch)]
        for i in range(nframes * nch):
            samples.extend(_ima4_packet(pk[i * 34:(i + 1) * 34], states[i % nch]))
        if nch == 2:  # packets alternate channels
            left, right = [], []
            for i in range(nframes):
                left += samples[(2 * i) * 64:(2 * i + 1) * 64]
                right += samples[(2 * i + 1) * 64:(2 * i + 2) * 64]
            samples = [s for pair in zip(left, right) for s in pair]
        return dict(rate=rate, channels=nch, bits=16, data=struct.pack('<%dh' % len(samples), *samples))
    raise ValueError('encoding %02x' % enc)
