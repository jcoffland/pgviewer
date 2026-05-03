// Binary min-heap. Grows dynamically. The `less` comparator returns true
// when a < b. To use as a max-heap, invert the comparator at the call site.
export default class MinHeap {
  constructor(less) {
    this.less = less
    this.heap = []
  }


  get fill() {return this.heap.length}


  clear() {this.heap.length = 0}


  push(entry) {
    const heap = this.heap
    let   pos  = heap.length
    heap.push(entry)

    while (0 < pos) {
      const parent = (pos - 1) >> 1
      if (!this.less(entry, heap[parent])) break
      heap[pos] = heap[parent]
      pos = parent
    }

    heap[pos] = entry
  }


  pop() {
    const heap = this.heap
    const n    = heap.length - 1
    if (n < 0) return
    const top  = heap[0]
    if (!n) {heap.length = 0; return top}

    const entry = heap[n]
    heap.length = n
    let pos = 0
    let l   = 1

    while (l < n) {
      let m = l
      if (l + 1 < n && this.less(heap[l + 1], heap[l])) m = l + 1
      if (!this.less(heap[m], entry)) break
      heap[pos] = heap[m]
      pos = m
      l   = (pos << 1) + 1
    }

    heap[pos] = entry
    return top
  }


  peek() {return this.heap[0]}
}
