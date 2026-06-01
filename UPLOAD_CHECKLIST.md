# 上传检查清单

上传 GitHub 前确认：

- 微信开发者工具可以导入项目根目录
- `app.json`、`project.config.json`、`sitemap.json` 可以正常解析
- 本地 Git 分支为 `main`
- 远程仓库地址正确
- 不上传本机私有配置文件 `project.private.config.json`

当前远程仓库：

```text
https://github.com/Twb1994/worktime.git
```

推送命令：

```bash
git push -u origin main
```
