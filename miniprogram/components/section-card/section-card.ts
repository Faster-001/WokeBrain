Component({
  options: {
    multipleSlots: true
  },
  methods: {
    onHeaderTap() {
      this.triggerEvent('headertap')
    }
  }
})
