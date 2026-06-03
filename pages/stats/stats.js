const { createWorkbook } = require('../../utils/xlsx')

const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = () => formatDate(new Date())
const currentMonth = () => today().slice(0, 7)
const monthStart = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

const monthEnd = (month) => {
  const [year, monthNumber] = month.split('-').map(Number)
  return formatDate(new Date(year, monthNumber, 0))
}

const emptySummary = () => ({
  count: 0,
  normalHours: '0.00',
  overtimeHours: '0.00',
  pay: '0.00'
})

const toFixed = (number) => Number(number).toFixed(2)

Page({
  data: {
    selectedMonth: currentMonth(),
    startDate: monthStart(),
    endDate: today(),
    summary: emptySummary(),
    workerStats: [],
    filteredRecords: []
  },

  onShow() {
    this.buildStats()
  },

  onStartDateChange(event) {
    this.setData({ startDate: event.detail.value })
    this.buildStats()
  },

  onEndDateChange(event) {
    this.setData({ endDate: event.detail.value })
    this.buildStats()
  },

  onMonthChange(event) {
    const selectedMonth = event.detail.value
    this.setData({
      selectedMonth,
      startDate: `${selectedMonth}-01`,
      endDate: monthEnd(selectedMonth)
    })
    this.buildStats()
  },

  buildStats() {
    const records = (wx.getStorageSync('records') || []).filter((record) => {
      return record.date >= this.data.startDate && record.date <= this.data.endDate
    })
    const total = records.reduce((result, record) => {
      result.count += 1
      result.normalHours += record.normalHours
      result.overtimeHours += record.overtimeHours
      result.pay += record.pay
      return result
    }, { count: 0, normalHours: 0, overtimeHours: 0, pay: 0 })

    const byWorker = {}
    records.forEach((record) => {
      const key = record.workerId
      if (!byWorker[key]) {
        byWorker[key] = {
          workerName: record.workerName,
          normalHours: 0,
          overtimeHours: 0,
          pay: 0
        }
      }
      byWorker[key].normalHours += record.normalHours
      byWorker[key].overtimeHours += record.overtimeHours
      byWorker[key].pay += record.pay
    })

    this.setData({
      summary: {
        count: total.count,
        normalHours: toFixed(total.normalHours),
        overtimeHours: toFixed(total.overtimeHours),
        pay: toFixed(total.pay)
      },
      filteredRecords: records,
      workerStats: Object.keys(byWorker).map((key) => ({
        workerName: byWorker[key].workerName,
        normalHours: toFixed(byWorker[key].normalHours),
        overtimeHours: toFixed(byWorker[key].overtimeHours),
        pay: toFixed(byWorker[key].pay)
      }))
    })
  },

  exportXlsx() {
    if (this.data.filteredRecords.length === 0) {
      wx.showToast({ title: '没有可导出的记录', icon: 'none' })
      return
    }

    const header = ['日期', '工人', '正常工时', '加班小时', '固定每天工时', '日工资', '加班时薪', '工资', '备注']
    const rows = this.data.filteredRecords.map((record) => [
      record.date,
      record.workerName,
      record.normalHours,
      record.overtimeHours,
      record.standardHours,
      record.dayRate,
      record.overtimeRate,
      record.pay,
      record.remark || ''
    ])
    const filePath = `${wx.env.USER_DATA_PATH}/worktime_${this.data.startDate}_${this.data.endDate}.xlsx`

    wx.getFileSystemManager().writeFile({
      filePath,
      data: createWorkbook([header, ...rows]),
      success: () => {
        wx.setClipboardData({
          data: filePath,
          success: () => {
            wx.showModal({
              title: '导出成功',
              content: 'Excel 文件路径已复制，可用 Excel 或 WPS 打开。',
              showCancel: false
            })
          }
        })
      },
      fail: () => {
        wx.showToast({ title: '导出失败', icon: 'none' })
      }
    })
  }
})
