import Op from './Op';

export default class Iterator {
  ops: Op[];
  index: number;
  offset: number;

  constructor(ops: Op[]) {
    this.ops = ops;
    this.index = 0;
    this.offset = 0;
  }

  hasNext(): boolean {
    return this.peekLength() < Infinity;
  }
  /**
   * 函数允许调用者逐步处理和应用多个编辑操作，维护了操作的状态（索引和偏移量），确保了操作按顺序正确执行。
   * 1. index控制处理哪个操作。
   * 2. offset控制在当前操作中处理到哪里。
   * 「了解当前操作至那个字符，有可能这个字符存在一个操作中间，此时需要将一个操作拆成两个」
   */
  next(length?: number): Op {
    if (!length) {
      length = Infinity;
    }
    const nextOp = this.ops[this.index];
    if (nextOp) {
      const offset = this.offset;
      const opLength = Op.length(nextOp);
      if (length >= opLength - offset) {
        length = opLength - offset;
        this.index += 1;
        this.offset = 0;
      } else {
        this.offset += length;
      }
      if (typeof nextOp.delete === 'number') {
        return { delete: length };
      } else {
        const retOp: Op = {};
        if (nextOp.attributes) {
          retOp.attributes = nextOp.attributes;
        }
        if (typeof nextOp.retain === 'number') {
          retOp.retain = length;
        } else if (
          typeof nextOp.retain === 'object' &&
          nextOp.retain !== null
        ) {
          // offset should === 0, length should === 1
          retOp.retain = nextOp.retain;
        } else if (typeof nextOp.insert === 'string') {
          retOp.insert = nextOp.insert.substr(offset, length);
        } else {
          // offset should === 0, length should === 1
          retOp.insert = nextOp.insert;
        }
        return retOp;
      }
    } else {
      return { retain: Infinity };
    }
  }

  peek(): Op {
    return this.ops[this.index];
  }

  peekLength(): number {
    if (this.ops[this.index]) {
      // Should never return 0 if our index is being managed correctly
      return Op.length(this.ops[this.index]) - this.offset;
    } else {
      return Infinity;
    }
  }

  peekType(): string {
    const op = this.ops[this.index];
    if (op) {
      if (typeof op.delete === 'number') {
        return 'delete';
      } else if (
        typeof op.retain === 'number' ||
        (typeof op.retain === 'object' && op.retain !== null)
      ) {
        return 'retain';
      } else {
        return 'insert';
      }
    }
    return 'retain';
  }

  rest(): Op[] {
    if (!this.hasNext()) {
      return [];
    } else if (this.offset === 0) {
      return this.ops.slice(this.index);
    } else {
      const offset = this.offset;
      const index = this.index;
      const next = this.next();
      const rest = this.ops.slice(this.index);
      this.offset = offset;
      this.index = index;
      return [next].concat(rest);
    }
  }
}
