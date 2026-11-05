import struct
import sys


FREE = 0xFFFFFFFF
END = 0xFFFFFFFE


def u16(data, offset):
    return struct.unpack_from("<H", data, offset)[0]


def u32(data, offset):
    return struct.unpack_from("<I", data, offset)[0]


class CompoundFile:
    def __init__(self, path):
        self.data = open(path, "rb").read()
        if self.data[:8] != bytes.fromhex("D0CF11E0A1B11AE1"):
            raise ValueError("Not an OLE compound file")
        self.sector_size = 1 << u16(self.data, 30)
        self.mini_sector_size = 1 << u16(self.data, 32)
        self.mini_cutoff = u32(self.data, 56)
        self.first_dir = u32(self.data, 48)
        first_mini_fat = u32(self.data, 60)
        mini_fat_count = u32(self.data, 64)
        first_difat = u32(self.data, 68)
        difat_count = u32(self.data, 72)

        difat = [u32(self.data, 76 + 4 * i) for i in range(109)]
        sector = first_difat
        for _ in range(difat_count):
            block = self.sector(sector)
            difat.extend(struct.unpack_from(f"<{self.sector_size // 4 - 1}I", block, 0))
            sector = u32(block, self.sector_size - 4)
        difat = [s for s in difat if s not in (FREE, END)]

        self.fat = []
        for fat_sector in difat:
            self.fat.extend(struct.unpack(f"<{self.sector_size // 4}I", self.sector(fat_sector)))

        directory = self.read_chain(self.first_dir, self.fat, self.sector_size)
        self.entries = {}
        self.root = None
        for offset in range(0, len(directory), 128):
            entry = directory[offset:offset + 128]
            if len(entry) < 128:
                continue
            name_len = u16(entry, 64)
            if name_len < 2:
                continue
            name = entry[:name_len - 2].decode("utf-16le", errors="ignore")
            kind = entry[66]
            item = {
                "name": name,
                "kind": kind,
                "start": u32(entry, 116),
                "size": struct.unpack_from("<Q", entry, 120)[0],
            }
            self.entries[name] = item
            if kind == 5:
                self.root = item

        self.mini_fat = []
        if mini_fat_count and first_mini_fat not in (FREE, END):
            raw = self.read_chain(first_mini_fat, self.fat, self.sector_size)
            self.mini_fat = list(struct.unpack(f"<{len(raw) // 4}I", raw))
        self.mini_stream = b""
        if self.root and self.root["start"] not in (FREE, END):
            self.mini_stream = self.read_chain(self.root["start"], self.fat, self.sector_size)[:self.root["size"]]

    def sector(self, number):
        start = (number + 1) * self.sector_size
        return self.data[start:start + self.sector_size]

    def read_chain(self, start, fat, unit, mini=False):
        chunks = []
        seen = set()
        sector = start
        while sector not in (FREE, END) and sector < len(fat) and sector not in seen:
            seen.add(sector)
            if mini:
                begin = sector * unit
                chunks.append(self.mini_stream[begin:begin + unit])
            else:
                chunks.append(self.sector(sector))
            sector = fat[sector]
        return b"".join(chunks)

    def stream(self, name):
        item = self.entries[name]
        if item["size"] < self.mini_cutoff and self.mini_fat:
            raw = self.read_chain(item["start"], self.mini_fat, self.mini_sector_size, mini=True)
        else:
            raw = self.read_chain(item["start"], self.fat, self.sector_size)
        return raw[:item["size"]]


def extract_word_text(path):
    ole = CompoundFile(path)
    word = ole.stream("WordDocument")
    flags = u16(word, 10)
    table_name = "1Table" if flags & 0x0200 else "0Table"
    table = ole.stream(table_name)
    fc_clx = u32(word, 0x1A2)
    lcb_clx = u32(word, 0x1A6)
    clx = table[fc_clx:fc_clx + lcb_clx]
    pos = 0
    while pos < len(clx) and clx[pos] == 0x01:
        size = u16(clx, pos + 1)
        pos += 3 + size
    if pos >= len(clx) or clx[pos] != 0x02:
        raise ValueError("Piece table not found")
    pcdt_size = u32(clx, pos + 1)
    plc = clx[pos + 5:pos + 5 + pcdt_size]
    piece_count = (len(plc) - 4) // 12
    cps = list(struct.unpack_from(f"<{piece_count + 1}I", plc, 0))
    pcd_start = 4 * (piece_count + 1)
    pieces = []
    for index in range(piece_count):
        pcd = pcd_start + index * 8
        raw_fc = u32(plc, pcd + 2)
        compressed = bool(raw_fc & 0x40000000)
        fc = raw_fc & 0x3FFFFFFF
        chars = cps[index + 1] - cps[index]
        if compressed:
            start = fc // 2
            chunk = word[start:start + chars]
            text = chunk.decode("cp1251", errors="replace")
        else:
            start = fc
            chunk = word[start:start + chars * 2]
            text = chunk.decode("utf-16le", errors="replace")
        pieces.append(text)
    return "".join(pieces)


if __name__ == "__main__":
    text = extract_word_text(sys.argv[1])
    sys.stdout.buffer.write(text.encode("utf-8"))
