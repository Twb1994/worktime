const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const calcPay = (record, normalHours, overtimeHours) => {
  const normalPay = record.standardHours > 0
    ? normalHours / record.standardHours * record.dayRate
    : 0
  const overtimePay = overtimeHours * record.overtimeRate
  return Number((normalPay + overtimePay).toFixed(2))
}

const blankForm = () => ({
  date: '',
  normalHours: '',
  overtimeHours: '',
  remark: ''
})

Page({
  data: {
    records: [],
    editingId: '',
    editForm: blankForm()
  },

  onShow() {
    this.loadRecords()
  },

  loadRecords() {
    this.setData({
      records: wx.getStorageSync('records') || []
    })
  },

  editRecord(event) {
    const id = event.currentTarget.dataset.id
    const record = this.data.records.find((item) => item.id === id)
    if (!record) return
    this.setData({
      editingId: id,
      editForm: {
        date: record.date,
        normalHours: String(record.normalHours),
        overtimeHours: String(record.overtimeHours),
        remark: record.remark || ''
      }
    })
  },

  onEditDateChange(event) {
    this.setData({ 'editForm.date': event.detail.value })
  },

  onEditNormalHoursInput(event) {
    this.setData({ 'editForm.normalHours': event.detail.value })
  },

  onEditOvertimeHoursInput(event) {
    this.setData({ 'editForm.overtimeHours': event.detail.value })
  },

  onEditRemarkInput(event) {
    this.setData({ 'editForm.remark': event.detail.value })
  },

  saveEdit() {
    const normalHours = toNumber(this.data.editForm.normalHours)
    const overtimeHours = toNumber(this.data.editForm.overtimeHours)
    if (normalHours <= 0 && overtimeHours <= 0) {
      wx.showToast({ title: '请填写工时', icon: 'none' })
      return
    }

    const records = (wx.getStorageSync('records') || []).map((record) => {
      if (record.id !== this.data.editingId) return record
      return {
        ...record,
        date: this.data.editForm.date,
        normalHours,
        overtimeHours,
        remark: this.data.editForm.remark.trim(),
        pay: calcPay(record, normalHours, overtimeHours)
      }
    })
    wx.setStorageSync('records', records)
    this.cancelEdit()
    this.loadRecords()
    wx.showToast({ title: '已保存' })
  },

  cancelEdit() {
    this.setData({
      editingId: '',
      editForm: blankForm()
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
        if (this.data.editingId === id) this.cancelEdit()
        this.loadRecords()
      }
    })
  }
})
