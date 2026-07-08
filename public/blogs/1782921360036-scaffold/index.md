# 脚手架设计与我的 AI 编码实践

介绍我的脚手架和常用技术栈，以及我在 AI 编码中追求的仓库结构和能力。

我早期经常使用 [bati](https://batijs.dev/) 和 [create-vue](https://github.com/vuejs/create-vue) 等通用产品，但是形成了自己的开发工具链和配置习惯后，这种通用项目就不太够用了。

每次写新项目，前二十分钟的时间都是用来从上一个项目中复制那些通用的配置文件、建立项目的目录结构、安装依赖等，实在是有点烦人。让 Agent 帮忙配置又会导致各种小细节的差错，比如：

- TypeScript 6.0.0 的 `tsconfig.json` 弃用了 `baseUrl` 字段，但是 AI 还是倾向于写旧字段
- 我习惯将 oxc 等工具的 \*.config.ts 放在根目录，但是 AI 一般都会忘记也要将他们纳入根包的 fmt、lint 和 typecheck 中
- 就算叫他直接不要指定依赖版本，AI 有时还是会直接写记忆中的依赖版本到 package.json
- AI 生成的 ci 的 `uses` 基本都是早已过时的版本

基本就是老生常谈的模型记忆过时、全局一致性遗漏和供应链风险。

以及我还有一些电子洁癖：

- 一定会使用 .devcontainer，且使用自定义 Dockerfile 而不是 features 以确保镜像不会包含我不需要的工具（例如 typescript-node 镜像就自带 eslint 和对应扩展）
- 项目结构一定是 Turborepo 管理的 Monorepo，方便程序化地维护包边界防止架构腐坏
- 一定会使用最新的 pnpm 和 Node LTS
- 一定会使用 pnpm catalog 统一声明所有依赖的版本
- 一定会有 `#/*` 导入前缀
- 一定会让项目有一个根 `check` 命令可以运行所有包的 lint、fmt、typecheck、test，方便 Agent 形成反馈循环
- 一定会使用 Dependabot 和 Github Actions
- 一定会在 .vscode 中声明配置和扩展列表
- 采取严苛的 oxlint 和 tsconfig 规则集

维护一个 skill 当然也可以在一定程度上满足我的需求，但是怎么解决依赖 uses 和 Node 版本最新的问题？每次都让模型去查主页听起来不错，但是我嫌他浪费 token。用自然语言描述我的一些隐性的需求也实在很低效且不稳定。同时也为了提高技术设施层的确定性，不让我的项目从根上就开始一股 AI 的混乱味道，我选择自己维护一个脚手架。

## 设计和实现

我的脚手架需要有以下特征和功能：

- 每个仓库都是 Monorepo，开发进行过程中也可以再次引入新子包
- 所有依赖都是可以半自动化更新的，包括 pnpm、npm 包、Rust、Node、.devcontainer 所用镜像和工具链、ci 中的 `uses` 等，且对 npm 包，必须可解析原生的版本采用策略和 caret range 以缓解供应链攻击并复用原生的版本控制
- template 和他们的任意组合被生成出来后应该是没有任何 typecheck 和 lint 错误的
- 遵守 DRY，同一个版本号 / 文件之类在全库尽量只写一次
- 有一个干净的 CLI 可以给 Agent 用
- 可以满足所有电子洁癖

我本就要求全部仓库都是 Monorepo，所以实现中就算是一个单包 preset 也直接生成为一个子项目，避免了之后再 add 时还需要迁移原本的单包的麻烦。

依赖更新当然不能用自定义 updater 实现，基本思路是在仓库根目录维护一个 pnpm-workspace.yaml 和 Cargo.toml，让 Dependabot 去负责更新这两个文件引用的依赖版本。CLI 构造 preset 时再从文件中读取版本即可。

在项目创建后，就应该遵循依赖最小原则，不应该再依赖 template 这个外部工具存在。因此我没有设计任何更新现有项目的功能（add 功能也依赖 .template 目录存在，不使用就直接删除即可，已经添加的子包则没有任何删除或更新路径），现存项目的的依赖就用生成时包含的 Dependabot 进行更新即可。

## 效果

你可以运行 `pnpm dlx @ykdz/template@latest init my-app --preset vike-app --yes` 生成一个新的 vike-app 模板（生成器不会替你 `git init` / `pnpm install`）。你也可以在根目录执行 `x` 向这个 Web APP 添加一个 `packages/shared` 的纯 TS 库，我一般把前后端同构的工具函数和 zod / valibot schema 都放在这里。

有了 template，我可以在几十秒内就初始化一个完全符合我癖好和要求的项目脚手架。我的 Agent 在添加新的 ts 库来做架构隔离时也不需要自己发明仓库结构，而是可以关注业务代码。

为了这种灵活性，也做了一些取舍。最让我在意的是为了动态生成 tsconfig 等，就无法保持每一个 preset 自己目录树的完整性（例如 preset 内实际上没有自己的 tsconfig）。这就导致我不能在 IDE 内把 preset 作为一个完整的项目获取正确的 LSP 功能。作为替代，我设计了笛卡尔积测试矩阵，将所有 preset 组合并利用根 check 做 ci 时验证，虽然把错误延后了，但是至少还是可以在发版前拦截它们的。

## 我的编码实践

脚手架中的不少细节就只是我的怪癖而已，但是确有几点我认为对 AI 编码确实是有好处的。

### 根 check 任务

项目中 `typecheck`、`lint`、`fmt`、`test`、`test:e2e` 等任务的重要性是显而易见的，它们可以在编译前就程序化地暴露错误。对 Agent 编码更是如此，在一轮自然语言指示的变更后，上下文需要回答 "这轮工作是否足质足量地完成了" 的问题。Spec[^Spec] 当然可以用自然语言指示工作的边界，但是只有程序化的错误报告才能消除 Agent 的质量幻觉。

一个根 check 任务则可以进一步消除有时会因为上下文压缩或指示不清而出现的 "没有完整运行全部测试" 的问题。

另外既然 Agent 需频繁运行这个任务，那么为了节省 token 和上下文窗口，就最好确保这个任务的输出最短，我认为最好是确保它仅输出详细的错误信息而不输出任何成功的子任务（只产生一行简单的标注等防止幻觉），且尽量不输出装饰用的内容。

我使用的工具链大多都可以实现类似的效果：

```shell
oxfmt --list-different
oxlint --quiet --format=unix
tsc --pretty false
vitest --reporter=agent
turbo --output-logs=errors-only
```

抱怨一下 [`nx`](https://github.com/nrwl/nx/discussions/35144)，他们似乎没有原生实现类似功能的打算。

### 严苛的 lint

传统开发中过于严苛的 lint 实在烦人，会拖慢编码人员的效率。但是以 AI 的编码速度，我们就可以为它加上更严苛的 lint 规则集，充分让 lint 在编译前发现潜在问题。典型的规则是 `typescript/no-explicit-any`，在 TS 中 AI 很喜欢用宽泛的类型定义逃课。

严苛的 lint 规则也会显著增加每轮工作中返工的次数，但少即是多，单轮内的返工是对代码质量有明显提升的，相当于某种确定性的 review 过程。

这里也要明确，只有那些真正对代码安全性和质量有提升的规则才是有价值的，至于 `eslint/no-plusplus` 之类我觉得更像是个人嗜好了。

### 每个仓库都是 Monorepo

在长期工作中的架构腐化一直是很多 skill 和工作流致力于解决的问题。但这些方案无非还是针对文档，在上下文上做文章。但 Monorepo 本身就可以稳定地避免高层架构的腐化。

首先，Monorepo 的包结构本身有比非 Monorepo 的目录隔离更强的语义，可以传达项目的高层架构。

另外，Monorepo 也是真的可以程序化地隔离没有在模块内部 export 的内容，比目录隔离不容易发生逃逸。

最后，它为外部的检测脚本划定了界线。例如 `rustdoc` 有将 crate 的模块结构和符号导出为 `json` 的功能，用 rust workspace 隔离的 crate 就可以被我的脚本单独分析，避免 Agent 在实现过程中又暴露不应公开的符号，或者将被弃用的老概念又带回来。另外 Turbo 本身还设计了 [`turbo boundaries`](https://turborepo.dev/docs/reference/boundaries) 的包依赖边界检测功能，我用它避免 AI 编码中本应消费 domain 包的宿主喜欢直接依赖 db 操作数据库对象的问题。这也只有在 Monorepo 中才能实现。

## 总结

AI 编码的可靠性是一个分级处理的过程，我们常用的提示词的堆砌只是其中的一个不确定性比较高的环节。若可能，最好让所有的架构设计都可以像 lint 一样被一系列可以检查的规则描述并拥有与 typecheck 同等的地位。当然想完美做到这一点很困难。至少我会在项目初始化的过程中下很多功夫，尽量在底层稳定地解决问题，让 Agent 每一轮修改都必须经过反馈闭环。

---

[^Spec]: Specification，在编码中理解为需求描述书，一般就等于那个描述要做什么、不要做什么和怎么算完成三项的 `md` 文档
