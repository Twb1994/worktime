const blankForm = () => ({
  name: '',
  standardHours: '8',
  dayRate: '',
  overtimeRate: ''
})

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

Page({
  data: {
    workers: [],
    editingId: '',
    form: blankForm()
  },

  onShow() {
    this.loadWorkers()
  },

  loadWorkers() {
    this.setData({
      workers: wx.getStorageSync('workers') || []
    })
  },

  onNameInput(event) {
    this.setData({ 'form.name': event.detail.value })
  },

  onStandardHoursInput(event) {
    this.setData({ 'form.standardHours': event.detail.value })
  },

  onDayRateInput(event) {
    this.setData({ 'form.dayRate': event.detail.value })
  },

  onOvertimeRateInput(event) {
    this.setData({ 'form.overtimeRate': event.detail.value })
  },

  saveWorker() {
    const name = this.data.form.name.trim()
    const standardHours = toNumber(this.data.form.standardHours)
    const dayRate = toNumber(this.data.form.dayRate)
    const overtimeRate = toNumber(this.data.form.overtimeRate)

    if (!name) {
      wx.showToast({ title: '请填写姓名', icon: 'none' })
      return
    }
    if (standardHours <= 0 || dayRate < 0 || overtimeRate < 0) {
      wx.showToast({ title: '请检查工资设置', icon: 'none' })
      return
    }

    const workers = wx.getStorageSync('workers') || []
    if (this.data.editingId) {
      const nextWorkers = workers.map((worker) => {
        if (worker.id !== this.data.editingId) return worker
        return { id: worker.id, name, standardHours, dayRate, overtimeRate }
      })
      wx.setStorageSync('workers', nextWorkers)
    } else {
      workers.push({
        id: Date.now().toString(),
        name,
        standardHours,
        dayRate,
        overtimeRate
      })
      wx.setStorageSync('workers', workers)
    }

    this.resetForm()
    this.loadWorkers()
    wx.showToast({ title: '已保存' })
  },

  editWorker(event) {
    const id = event.currentTarget.dataset.id
    const worker = this.data.workers.find((item) => item.id === id)
    if (!worker) return
    this.setData({
      editingId: id,
      form: {
        name: worker.name,
        standardHours: String(worker.standardHours),
        dayRate: String(worker.dayRate),
        overtimeRate: String(worker.overtimeRate)
      }
    })
  },

  deleteWorker(event) {
    const id = event.currentTarget.dataset.id
    wx.showModal({
      title: '删除工人',
      content: '删除后，已有记工记录仍会保留姓名和金额。',
      success: (res) => {
        if (!res.confirm) return
        const workers = (wx.getStorageSync('workers') || []).filter((worker) => worker.id !== id)
        wx.setStorageSync('workers', workers)
        if (this.data.editingId === id) this.resetForm()
        this.loadWorkers()
      }
    })
  },

  resetForm() {
    this.setData({
      editingId: '',
      form: blankForm()
    })
  }
})
