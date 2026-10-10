"""Classic Mac OS resource fork reader."""
import struct


def read_resource_fork(data):
    """Return {type: {id: (name, bytes)}} for a raw resource fork."""
    d_off, m_off, _d_len, m_len = struct.unpack('>IIII', data[:16])
    m = data[m_off:m_off + m_len]
    type_list_off, name_list_off = struct.unpack('>HH', m[24:28])
    tl = m[type_list_off:]
    ntypes = struct.unpack('>h', tl[:2])[0] + 1
    out = {}
    for t in range(ntypes):
        rtype, nres, ref_off = struct.unpack('>4shH', tl[2 + t * 8:10 + t * 8])
        rtype = rtype.decode('mac_roman')
        for r in range(nres + 1):
            e = tl[ref_off + r * 12:ref_off + r * 12 + 12]
            rid, name_off, attr_and_off = struct.unpack('>hhI', e[:8])
            name = ''
            if name_off != -1:
                p = name_list_off + name_off
                name = m[p + 1:p + 1 + m[p]].decode('mac_roman')
            p = d_off + (attr_and_off & 0xFFFFFF)
            ln = struct.unpack('>I', data[p:p + 4])[0]
            out.setdefault(rtype, {})[rid] = (name, data[p + 4:p + 4 + ln])
    return out


def pstring(b, p=0):
    return b[p + 1:p + 1 + b[p]].decode('mac_roman')


def str_list(blob):
    """'STR#' resource -> list of strings."""
    n = struct.unpack('>H', blob[:2])[0]
    out, p = [], 2
    for _ in range(n):
        out.append(pstring(blob, p))
        p += 1 + blob[p]
    return out
