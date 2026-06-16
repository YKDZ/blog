# 我的博客

此文旨在测试博客的 md 渲染能力和内容页功能，也顺便介绍一下我的小博客。

本站点是由 vike[^vike] 驱动的，以 SSG[^SSG] 模式在构建阶段完成渲染并部署在 [GitHub Pages](https://github.com/YKDZ/blog/deployments/github-pages) 上。

## 背景

博客最终还是以内容为中心的，因此我觉得码字体验是高于一切的。我曾尝试过 WordPress、Halo、VitePress、Ghost、Mix Space 等各种形态的博客应用，有 SSG 也有全栈应用。但这些通用产品对我来说都有令人不满的地方，例如：

- VitePress 虽然是 SSG，但是毕竟还是为产品文档一类需求设计的，写文章还要考虑 Sidebar 位置，不能做到在一个 `.md` 中就完成全部工作。另外文档标题、正文标题、`Sidebar Item` 标题又都是分开的，不符合 **DRY**[^DRY] 原则
- Halo、WordPress、Ghost、Mix Space 等首先都是依赖 Web Server 的全栈应用。其次它也不是专门的博客应用，还兼顾知识库、官网等用例，且为了追赶潮流都有各种 AI 功能，对我就显得臃肿。另外写文章还得用 Web 编辑器，不够顺手

因此我就做了这么一个简单的小应用来满足自己的需求。用它，我可以：

- 直接编辑 markdown 文件，不用为了写个博客就花时间适应那些 WYSIWYG 编辑器
- 产出静态页面，白嫖 GitHub Pages 的服务器，不用为了写博客多花钱
- 文章直接以文件形式储存在 GitHub 上，安全可靠
- 从写文章到预览到发布的全流程都可以在一个 VSCode 窗口内完成，很契合我的工作习惯
  ![编辑器](./assets/编辑器.png)
- 可以自己控制全部样式和布局，因此可以做出现在的这种超级复 ~~ya~~ 古 ~~yi~~ 效果
- 可以自由扩展我喜欢的阅读器功能，比如 [hover 预览](./index.md#icon)

## 设计理念

### DRY

> 在一个系统中，每一处知识都必须单一、明确、权威地表达。  
> 《The Pragmatic Programmer》

当然抛开大道理不谈，我也不希望把一个文章标题写两三遍，特别还是要在 frontmatter，也就是在同一个文档内编写重复的文本。

因此，我的博客标题实际上是取自整个 md 文档内容的第一个 heading。我在主页的博文卡片和内容页的大标题处使用这个推断出的标题文本。

### 易用性

写文章本来就很费心了，我不想再给自己加任务。目前我的工作流是：

```bash
# 创建文档模板
pnpm write second
/workspaces/blog/public/blogs/1781614950277-second/index.md
# 启动开发服务器
pnpm dev
```

这样就可以在侧边栏实时预览渲染效果，并在 VSCode 中编辑文档。

写完后就直接通过 VSCode 的源代码管理 UI 进行提交和推送即可，GitHub Action 会自动触发并完成测试、构建和发布到 Pages 的工作。

这种两条命令就可以开始写文章的复杂度对我来说是可以接受的，多几个步骤换来的是与编码心智模型相同的码字体验。

### 灵活度

我用 vite 原生支持的 Static Assets 机制在 `public/blogs/` 目录下管理所有文档。`pnpm write <slug>` 命令会帮我创建以下格式的博客模板：

```
<timestamp-slug>
├── assets/
└── index.md
```

在写文章时，我不用考虑图片等静态文件的放置位置，可以自由地用 `public/a/b/c.png`、`./assets/a.png`、`../xxx/assets/b.png`、`../xxx/index.md#title` 等各种方式引用 `public` 目录中的静态资源和其他文章等。在渲染时，一个 `remark` 插件会完成目录的映射工作，将对文档的引用解析为 `/blog/slug/#hash` 的形式，而将其他静态资源解析为相对于 `/` 的 url 形式，以便直接利用 Static Assets 机制引用打包好的静态资源。

同时，文章的创建时间也自然地被通过目录名中的 unix timestamp 维护起来，且可以实现文章自然地按时间顺序在目录下排序。

## Icon

本站的 favicon 是这个：

![favicon](../../favicon.svg)

原图来自 [Yesicon](https://yesicon.app/hugeicons/cook-book)（MIT 协议），自行修改为黑色背景和白色主体。

这是一本食谱书，寓意搞软件如烹饪，是纯粹的创造。因此这个博客除了技术内容之外应该也会整理一些原创食谱。

---

[^vike]: [vike](https://vike.dev) 是基于 vite 的元框架，有极高的自由度，不限制前端框架、渲染策略、后端框架和部署方式等

[^SSG]: [Static Site Generator](https://developer.mozilla.org/zh-CN/docs/Glossary/SSG)，静态站点生成器

[^DRY]: [Don't Repeat Yourself](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)，即不要重复自己，对本例来说就是标题写一次就够了
