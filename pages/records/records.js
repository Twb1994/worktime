Page({
  data: {
    records: []
  },

  onShow() {
    this.loadRecords()
  },

  loadRecords() {
    this.setData({
      records: wx.getStorageSync('records') || []
    })
  },

  deleteRecord(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条记工记录吗？',
      success: (res) => {
        if (!res.confirm) return
        const records = (wx.getStorageSync('records') || []).filter((record) => record.id !== id)
        wx.setStorageSync('records', records)
        this.loadRecords()
      }
    })
  }
})
