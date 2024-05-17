export function parseFilter(str: string): Map<string, string>|null {
  const result = new Map<string, string>();
  const parser = new Parser(str);
  if (parser.parseEnd()) return result;
  while (true) {
    const key = parser.parse();
    if (key === null) return null;
    if (!parser.parseEq()) return null;
    const value = parser.parse();
    if (value === null) return null;
    if (result.has(key)) return null;
    result.set(key, value);
    if (!parser.parseAnd()) break;
  }
  if (!parser.parseEnd()) return null;
  return result;
}

class Parser{
  private pos = 0;
  constructor(private str: string){}

  parseEnd(): boolean {
    this.skipWhiteSpaces();
    return this.pos === this.str.length;
  }

  parsePlain(): string {
    this.skipWhiteSpaces();
    const start = this.pos;
    while (this.pos < this.str.length && !isWhiteSpace(this.str[this.pos]) && this.str[this.pos] !== "=") {
      ++this.pos;
    }
    return this.str.substring(start, this.pos);
  }

  parse(): string|null {
    this.skipWhiteSpaces();
    if (this.pos < this.str.length && this.str[this.pos] === "\"") {
      // quoted string
      ++this.pos;
      let escaped = false;
      let value = "";
      while(this.pos < this.str.length) {
        if (this.str[this.pos] === "\\") {
          if (escaped) {
            value += "\\";
          }
          escaped = !escaped;
        } else if (this.str[this.pos] === "\"") {
          if (!escaped) {
            // finished parsing quoted
            ++this.pos;
            return value;
          }
          escaped = false;
          value += "\"";
        } else {
          value += this.str[this.pos];
        }
        ++this.pos;
      }
      // no close quote found
      return null;
    }
    // non-quoted
    const plain = this.parsePlain();
    if (plain.length === 0) return null;
    return plain;
  }

  parseEq(): boolean {
    this.skipWhiteSpaces();
    if (this.pos < this.str.length && this.str[this.pos] === "=") {
      ++this.pos;
      return true;
    }
    return false;
  }

  parseAnd(): boolean {
    const pos = this.pos;
    const result = this.parsePlain() === "and";
    if (!result) {
      this.pos = pos;
    }
    return result;
  }

  skipWhiteSpaces() {
    while (this.pos < this.str.length && isWhiteSpace(this.str[this.pos])) {
      ++this.pos;
    }
  }
}

function isWhiteSpace(ch: string){
  return ch === " " || ch === "\t" || ch === "\v" || ch === "\r" || ch === "\f" || ch === "\n";
}