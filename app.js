App({
  onLaunch() {
    const workers = wx.getStorageSync('workers')
    if (!workers || workers.length === 0) {
      wx.setStorageSync('workers', [
        {
          id: Date.now().toString(),
          name: '默认工人',
          standardHours: 8,
          dayRate: 300,
          overtimeRate: 40
        }
      ])
    }
  }
})
