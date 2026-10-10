# deark with StuffIt Arsenic support

`Squirrel_Kombat.sit` is a StuffIt 5 archive whose files use method 15 ("Arsenic"), which stock
deark does not decompress. `arsenic.inc` is a C port of the Arsenic decoder from XADMaster
(`XADStuffItArsenicHandle.m`, LGPL 2.1): arithmetic-coded MTF/BWT blocks with optional
randomisation and a final RLE stage.

```sh
git clone https://github.com/jsummers/deark.git
cd deark
git checkout f0ab01f8f02dad52a5e01239d962dbf8a6cd5f9a
git apply /path/to/tools/extract/deark/stuffit-arsenic.patch
cp /path/to/tools/extract/deark/arsenic.inc modules/
make
```

deark's own per-file CRC check reports a mismatch for Arsenic entries; the Arsenic stream's
internal CRC-32 is verified by the decoder and passes for every file in the archive.
