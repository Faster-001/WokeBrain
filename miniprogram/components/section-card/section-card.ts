Component({
  options: {
    multipleSlots: true
  },
  properties: {
    showHeader: {
      type: Boolean,
      value: true
    },
    headerClickable: {
      type: Boolean,
      value: true
    }
  },
  methods: {
    onHeaderTap() {
      if (this.properties.headerClickable) {
        this.triggerEvent('headertap')
      }
    }
  }
})
