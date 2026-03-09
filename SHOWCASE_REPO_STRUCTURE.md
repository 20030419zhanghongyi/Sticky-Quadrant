# 产品展示仓库建议结构（非开源试用路线）

## 适合放在仓库中的内容

- `README.md`（产品介绍、使用方式、权利声明）
- `RELEASE_NOTES_v0.1.1.md`（版本发布说明）
- `RELEASE_CHECKLIST.md`（发布流程）
- 截图文件（如 `docs/screenshots/*.png`）
- 可选：`CHANGELOG.md`（后续版本更新摘要）

## 不适合公开放入的内容

- 完整源码目录（如 `src/`, `electron/`）
- 内部构建脚本与私有实现细节
- 调试用临时文件、开发过程记录

## 推荐发布模式

1. 当前本地项目作为私有开发仓库
2. 另建或使用当前 GitHub 仓库作为“展示仓库”
3. 展示仓库只保留文档与截图，不放完整源码
4. 通过 GitHub Releases 上传 Windows EXE 做试用分发
