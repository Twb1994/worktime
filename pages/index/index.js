const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = () => formatDate(new Date())

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const calcPay = (worker, normalHours, overtimeHours) => {
  if (!worker) return '0.00'
  const normalPay = worker.standardHours > 0
    ? normalHours / worker.standardHours * worker.dayRate
    : 0
  const overtimePay = overtimeHours * worker.overtimeRate
  return (normalPay + overtimePay).toFixed(2)
}

Page({
  data: {
    workers: [],
    workerNames: [],
    workerIndex: 0,
    currentWorker: {},
    form: {
      date: today(),
      normalHours: '8',
      hasOvertime: false,
      overtimeHours: '',
      remark: ''
    },
    previewPay: '0.00'
  },

  onShow() {
    const workers = wx.getStorageSync('workers') || []
    const workerIndex = Math.min(this.data.workerIndex, Math.max(workers.length - 1, 0))
    this.setData({
      workers,
      workerNames: workers.map((worker) => worker.name),
      workerIndex,
      currentWorker: workers[workerIndex] || {}
    })
    this.updatePreview()
  },

  onDateChange(event) {
    this.setData({ 'form.date': event.detail.value })
  },

  onWorkerChange(event) {
    const workerIndex = Number(event.detail.value)
    this.setData({
      workerIndex,
      currentWorker: this.data.workers[workerIndex]
    })
    this.updatePreview()
  },

  onNormalHoursInput(event) {
    this.setData({ 'form.normalHours': event.detail.value })
    this.updatePreview()
  },

  onOvertimeSwitch(event) {
    const hasOvertime = event.detail.value
    this.setData({
      'form.hasOvertime': hasOvertime,
      'form.overtimeHours': hasOvertime ? this.data.form.overtimeHours : ''
    })
    this.updatePreview()
  },

  onOvertimeHoursInput(event) {
    this.setData({ 'form.overtimeHours': event.detail.value })
    this.updatePreview()
  },

  onRemarkInput(event) {
    this.setData({ 'form.remark': event.detail.value })
  },

  updatePreview() {
    const normalHours = toNumber(this.data.form.normalHours)
    const overtimeHours = this.data.form.hasOvertime ? toNumber(this.data.form.overtimeHours) : 0
    this.setData({
      previewPay: calcPay(this.data.currentWorker, normalHours, overtimeHours)
    })
  },

  saveRecord() {
    const worker = this.data.currentWorker
    if (!worker.id) {
      wx.showToast({ title: '请先添加工人', icon: 'none' })
      return
    }

    const normalHours = toNumber(this.data.form.normalHours)
    const overtimeHours = this.data.form.hasOvertime ? toNumber(this.data.form.overtimeHours) : 0
    if (normalHours <= 0 && overtimeHours <= 0) {
      wx.showToast({ title: '请填写工时', icon: 'none' })
      return
    }

    const records = wx.getStorageSync('records') || []
    records.unshift({
      id: Date.now().toString(),
      date: this.data.form.date,
      workerId: worker.id,
      workerName: worker.name,
      normalHours,
      overtimeHours,
      standardHours: worker.standardHours,
      dayRate: worker.dayRate,
      overtimeRate: worker.overtimeRate,
      remark: this.data.form.remark.trim(),
      pay: Number(calcPay(worker, normalHours, overtimeHours))
    })
    wx.setStorageSync('records', records)
    this.setData({ 'form.remark': '' })
    wx.showToast({ title: '已保存' })
  }
})
