const crcTable = (() => {
  const table = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

const utf8Bytes = (text) => {
  const bytes = []
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i += 1
      }
    }
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return new Uint8Array(bytes)
}

const crc32 = (bytes) => {
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const write16 = (target, offset, value) => {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

const write32 = (target, offset, value) => {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

const concat = (parts) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  parts.forEach((part) => {
    result.set(part, offset)
    offset += part.length
  })
  return result
}

const dosDateTime = () => {
  const now = new Date()
  return {
    time: (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2),
    date: ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  }
}

const localHeader = (nameBytes, dataBytes, crc, time, date) => {
  const header = new Uint8Array(30 + nameBytes.length)
  write32(header, 0, 0x04034b50)
  write16(header, 4, 20)
  write16(header, 6, 0x0800)
  write16(header, 8, 0)
  write16(header, 10, time)
  write16(header, 12, date)
  write32(header, 14, crc)
  write32(header, 18, dataBytes.length)
  write32(header, 22, dataBytes.length)
  write16(header, 26, nameBytes.length)
  write16(header, 28, 0)
  header.set(nameBytes, 30)
  return header
}

const centralHeader = (nameBytes, dataBytes, crc, time, date, offset) => {
  const header = new Uint8Array(46 + nameBytes.length)
  write32(header, 0, 0x02014b50)
  write16(header, 4, 20)
  write16(header, 6, 20)
  write16(header, 8, 0x0800)
  write16(header, 10, 0)
  write16(header, 12, time)
  write16(header, 14, date)
  write32(header, 16, crc)
  write32(header, 20, dataBytes.length)
  write32(header, 24, dataBytes.length)
  write16(header, 28, nameBytes.length)
  write16(header, 30, 0)
  write16(header, 32, 0)
  write16(header, 34, 0)
  write16(header, 36, 0)
  write32(header, 38, 0)
  write32(header, 42, offset)
  header.set(nameBytes, 46)
  return header
}

const zip = (files) => {
  const { time, date } = dosDateTime()
  const localParts = []
  const centralParts = []
  let offset = 0

  files.forEach((file) => {
    const nameBytes = utf8Bytes(file.name)
    const dataBytes = utf8Bytes(file.content)
    const crc = crc32(dataBytes)
    const local = localHeader(nameBytes, dataBytes, crc, time, date)
    const central = centralHeader(nameBytes, dataBytes, crc, time, date, offset)
    localParts.push(local, dataBytes)
    centralParts.push(central)
    offset += local.length + dataBytes.length
  })

  const central = concat(centralParts)
  const end = new Uint8Array(22)
  write32(end, 0, 0x06054b50)
  write16(end, 8, files.length)
  write16(end, 10, files.length)
  write32(end, 12, central.length)
  write32(end, 16, offset)
  write16(end, 20, 0)

  return concat([...localParts, central, end]).buffer
}

const xml = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

const columnName = (index) => {
  let name = ''
  let number = index + 1
  while (number > 0) {
    const mod = (number - 1) % 26
    name = String.fromCharCode(65 + mod) + name
    number = Math.floor((number - mod) / 26)
  }
  return name
}

const cell = (value, rowIndex, columnIndex) => {
  const ref = `${columnName(columnIndex)}${rowIndex + 1}`
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"><v>${value}</v></c>`
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${xml(value)}</t></is></c>`
}

const sheetXml = (rows) => {
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cell(value, rowIndex, columnIndex)).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`
}

const workbookFiles = (rows) => [
  {
    name: '[Content_Types].xml',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
  },
  {
    name: '_rels/.rels',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  },
  {
    name: 'xl/workbook.xml',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="记工统计" sheetId="1" r:id="rId1"/></sheets>
</workbook>`
  },
  {
    name: 'xl/_rels/workbook.xml.rels',
    content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`
  },
  {
    name: 'xl/worksheets/sheet1.xml',
    content: sheetXml(rows)
  }
]

const createWorkbook = (rows) => zip(workbookFiles(rows))

module.exports = {
  createWorkbook
}
