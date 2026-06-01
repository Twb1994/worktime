const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = () => formatDate(new Date())
const monthStart = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
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
    startDate: monthStart(),
    endDate: today(),
    summary: emptySummary(),
    workerStats: []
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
      workerStats: Object.keys(byWorker).map((key) => ({
        workerName: byWorker[key].workerName,
        normalHours: toFixed(byWorker[key].normalHours),
        overtimeHours: toFixed(byWorker[key].overtimeHours),
        pay: toFixed(byWorker[key].pay)
      }))
    })
  }
})
