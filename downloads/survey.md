# Agent Memory 文献综述：从历史检索到可验证的经验演化

> 从历史检索到可验证的经验演化：方法、评测与安全。

## 摘要

Agent memory 的研究目标已超出保存聊天历史：系统既要记住用户和环境事实，也要从执行轨迹中提取可复用策略，甚至调整记忆操作和运行框架。但这些工作对“记忆”和“自进化”的定义并不统一，问答准确率、任务成功率、成本和安全性也常被放在不可直接比较的实验条件下讨论。本文覆盖自进化、多模态与安全研究，并结合基础架构、长期记忆评测和负面证据，按“记忆内容—更新机制—调用方式”组织方法，并将评测和治理作为贯穿各分支的约束。现有证据支持三个有条件的判断：记忆收益取决于历史信息是否真正构成当前决策瓶颈，而非是否使用更复杂的存储结构；经验抽象和记忆架构搜索能够改善部分任务，但不能据此认定系统获得了开放式递归自我改进能力；记忆维护不仅要保证内容忠实，还必须保存来源、适用范围、权限和撤销状态。未来值得重点研究的不是单纯扩大记忆容量，而是如何在预算、分布漂移和不可信反馈下，决定哪些经验应进入长期状态、何时可以升级为行为规则，以及如何验证和撤销这种升级。

## 1. 引言：为什么不能把 Agent Memory 等同于 RAG

一个 Agent 可能准确记得“某网页建议关闭检查”，却错误地把它当成“用户授权关闭检查”；也可能保存了大量成功轨迹，却无法判断哪一条适合当前任务。这两种失败说明，保存信息、利用经验和获得行动授权是不同问题。CoALA 从认知架构角度区分工作记忆与长期记忆，近期综述进一步将记忆视为长期适应的基础；两者共同强调记忆与决策的联系，但覆盖的更新层次和应用场景并不相同 [[1]](../papers/2309.02427.html)[[2]](../papers/2602.06052.html)。

与以文档片段支撑回答的经典 RAG 相比，Agent memory 还可能接收 Agent 自身产生的轨迹、反思、工具结果和技能，并影响下一轮执行。RAG 是其中一种读取机制，而不是全部系统定义；同样，外部知识库并不天然静态，动态 RAG 与 Agent memory 在工程实现上存在重叠。真正需要区分的是数据来源、更新策略、跨任务持续性以及记忆是否改变行为控制 [[3]](../papers/2005.11401.html)[[4]](../papers/2604.08224.html)。

本文回答三个问题：

- **RQ1：** Agent memory 存储什么，如何组织、更新和调用？哪些工作改变记忆内容，哪些改变记忆管理规则？
- **RQ2：** 相对无记忆 Agent、长上下文和普通检索，记忆的收益在什么条件下成立？现有评测能证明什么，不能证明什么？
- **RQ3：** 在长期自进化和多模态场景中，如何处理错误累积、经验失配、权限混淆、投毒与遗忘？

以下先交代文献范围与分类，再讨论信息记忆、经验演化和多模态记忆，随后比较评测证据与安全治理，最后提出可检验的研究问题。

## 2. 研究范围与比较原则

本文讨论持久记忆架构、记忆操作学习、经验与技能演化、多模态记忆，以及相关评测和治理。主要覆盖 2023—2026 年研究，并回溯 RAG 等基础工作。一般长上下文和模型参数更新作为邻接方向，不将所有长序列模型或自进化系统都归为 Agent memory。

比较方法时，应同时观察骨干模型、历史长度、记忆预算、反馈可见性和评测器。实验条件不同的分数不能直接组成排行榜；引用预印本的数字时，应固定相应版本。

## 3. 分类框架：记忆对象与更新层次必须分开

### 3.1 按“记住什么”划分

CoALA 的认知分类与近期 Agent memory 综述均有解释力，但具体系统往往混合多种记忆，不能把一篇论文机械地塞进唯一类别。本文将分类单位设为**记忆条目或模块的功能**，而不是整篇论文 [[1]](../papers/2309.02427.html)[[2]](../papers/2602.06052.html)。

| 功能类别 | 主要内容 | 面向的问题 | 典型错误 |
|---|---|---|---|
| 工作记忆 | 当前目标、进度、待办、最近工具状态 | 现在做到哪里、下一步做什么 | 状态漂移、循环执行、丢失约束 |
| 事实/情景记忆 | 用户事实、事件、原始交互、时序证据 | 过去发生了什么、目前什么仍然有效 | 遗漏、过时事实、来源混淆 |
| 经验/程序记忆 | 成功模式、失败教训、工作流、可执行技能 | 类似问题应如何解决 | 错误归因、过度泛化、负迁移 |
| 记忆管理知识 | 提取、合并、删除、检索与组织策略 | 应如何记忆和利用经验 | 管理策略过拟合、写入放大 |

权限和隐私不是第五种互斥内容，而是任何记忆都可能需要的治理属性。对“用户偏好”和“工具返回的建议”使用同一种自然语言载体，并不意味着两者具有相同权威性。

### 3.2 按“改变什么”划分

A-MEM 修改记忆节点及其关联，MemSkill 学习和演化记忆操作，ALMA 则搜索以代码表达的记忆设计；三者都可能被称为 agentic 或 self-evolving memory，但更新对象明显不同 [[5]](../papers/2502.12110.html)[[6]](../papers/2602.02474.html)[[7]](../papers/2602.07755.html)。

可以用一个分析性记号表示：`M(t+1) = Uφ(M(t), 轨迹, 反馈)`。更新 `M` 是内容学习；改变 `φ` 才涉及更新规则学习；若连提出、验证和接受 `φ` 的外层过程也被改变，才触及更强意义的递归改进。这只是本文用于比较系统的记号，不是新理论。

因此至少要区分四层：**内容更新、操作策略学习、架构搜索、改进机制自身的更新**。此外，参数更新与外部记忆更新可以同时发生。把“基础模型没有微调”写成“系统完全没有训练”，会遗漏控制器或记忆管理模型的训练；把“重复执行改进循环”写成“系统学会改进其改进机制”，则会夸大递归性。

## 4. 信息记忆：从保存历史到维护可用证据

### 4.1 分层记忆解决容量，结构化维护解决可用性

Generative Agents 将观察写入记忆流，再形成高层反思以支持规划；MemGPT 借鉴操作系统，把有限上下文与外部存储之间的数据移动交给 Agent 管理。前者突出“经验如何影响行为”，后者突出“有限上下文如何使用更大的历史”，不能只用是否有向量数据库来比较 [[8]](../papers/2304.03442.html)[[9]](../papers/2310.08560.html)。MemoryBank 则面向持续个性化交互，引入基于时间和重要性的强化、遗忘机制，表明长期记忆还涉及对用户特征的维护，而非仅对当前任务扩容 [[10]](../papers/2305.10250.html)[[9]](../papers/2310.08560.html)。

后续工作把重点转向更新单元和组织结构。Mem0 从对话中提取、整合和检索重要事实；A-MEM 以带属性的互联笔记更新记忆网络；Zep 强调具有时间信息的知识关系。三者分别强调事实维护、语义关联和时序关系，因此“图结构优于向量存储”并不是现有证据支持的普遍结论：图中保留什么关系、何时失效，往往比有没有图更重要 [[11]](../papers/2504.19413.html)[[5]](../papers/2502.12110.html)[[12]](../papers/2501.13956.html)。

Hindsight 将世界事实、Agent 经历、实体摘要和演化中的信念区分为不同逻辑网络；相较于 Mem0 的事实抽取路线，其重要启示是区分证据与推断。不过这种区分提供的是表示和追踪基础，不等同于已经获得形式化授权安全 [[13]](../papers/2512.12818.html)[[11]](../papers/2504.19413.html)。

### 4.2 何时整合，比是否整合更值得研究

多数抽取式系统在输入到来后执行 LLM 处理，而 RecMem 将原始交互保留在轻量缓冲层，只在语义相近内容持续出现时进行情景与语义整合。与 SimpleMem 通过结构化压缩和语义合成提高信息密度相比，RecMem 首先改变的是**付出整合成本的时机**，而不是仅缩短整合后的文本 [[14]](../papers/2605.16045.html)[[15]](../papers/2601.02553.html)。

Infini Memory 采取另一种维护单元：将相关证据累积为主题文档，支持事实修订和多轮工具式读取。它与 A-MEM 的区别不只是文件与图，而是“主题内聚合并持续编辑”与“独立笔记及链接演化”的区别；二者都可能改善上下文组织，但也都必须面对摘要改变原始含义的问题 [[16]](../papers/2606.10677.html)[[5]](../papers/2502.12110.html)。

**表 1：现有架构分别优化访问、组织和维护成本，不存在脱离工作负载的统一最优结构。局限栏含本文基于机制的分析，不表示每项均已被原论文实验证实。**

| 方法 | 主要记忆单元与管理方式 | 关键设计取舍 | 使用边界 |
|---|---|---|---|
| MemGPT | 上下文内状态与外部存储分层 | 用主动换入换出弥补上下文容量 | 管理调用本身有成本；不自动解决经验正确性 |
| Mem0 | 从对话抽取和更新的重要事实 | 缩短读取上下文、维护事实 | 写入成本和丢失细节需单独核算 |
| A-MEM | 属性化笔记、动态链接和历史节点更新 | 增强跨记录关联 | 错误关联及错误更新可能持续影响后续读取 |
| Zep | 时间知识图谱 | 表达关系变化与有效时间 | 需要正确识别实体、关系及时间 |
| Hindsight | 区分事实、经历、摘要、信念 | 减少证据与推断的混同 | 类型区分不等于安全授权 |
| SimpleMem | 结构化压缩、语义合成、意图感知检索 | 提高信息密度，减少冗余 | 论文“lossless”用语不代表任意未来查询的数学无损保证 |
| RecMem | 原始交互缓冲＋重复触发整合 | 避免每轮执行昂贵抽取 | 罕见但重要的信息需保留直接检索通路 |
| Infini Memory | 可维护主题文档＋迭代读取 | 统一相关证据、支持长期修订 | 多轮检索成本和错误改写仍需控制 |

RecMem 的局限尤其值得保留：反复出现不等于重要，单次撤销授权或安全约束也可能决定后续行动。其原始交互层保留了这些信息的检索入口，所以不能把它误读为“出现次数不够就丢弃”；真正缺口是罕见事件没有同等机会进入高层结构。与 MemoryBank 的时间衰减相比，这提示遗忘和整合都应区分普通信息、关键约束和权限状态 [[14]](../papers/2605.16045.html)[[10]](../papers/2305.10250.html)。

## 5. 经验演化：从复用结果到学习如何记忆

### 5.1 从轨迹到策略：泛化不是摘要的自然结果

Reflexion 将语言反馈保存为情景反思，影响后续尝试；Voyager 将可复用行为保存为代码技能。与前者主要借助文字调整试错不同，后者能够直接调用已构造的程序，因此技能更接近可执行行为，而不只是信息提示 [[17]](../papers/2303.11366.html)[[18]](../papers/2305.16291.html)。

Agent Workflow Memory（AWM）从过去经验中归纳可重复使用的工作流；ReasoningBank 则从自评成功与失败的轨迹中提取一般性推理策略。二者都试图超越原始轨迹检索，但侧重点不同：AWM 强调重复程序，ReasoningBank 强调为什么成功、为什么失败以及如何把教训用于新任务。后者的 MaTTS 还增加每个任务上的交互经验，因此应把“更好的记忆”与“更多 test-time compute”分别消融 [[19]](../papers/2409.07429.html)[[20]](../papers/2509.25140.html)。

ACE 通过增量维护策略手册避免整段重写造成细节流失；Trace2Skill 把轨迹中的局部教训归纳为可移植技能目录；DeltaMem 则用基础经验和残差变化组织相似情境。它们共同反对把所有历史压成一个不断重写的短摘要，但采用的防失真机制不同：增量条目、跨轨迹归纳与保留情景差异分别解决不同问题 [[21]](../papers/2510.04618.html)[[22]](../papers/2603.25158.html)[[23]](../papers/2606.03083.html)。

这里最重要的判断是：**“局部成功”不等于“通用有效”。** 方法可能因为偶然环境条件奏效，也可能只是符合错误的自评器。下游测试必须包含新环境、条件反转和不应调用该技能的反例，而不能只计算记忆写入次数或技能数量。后文的经验投毒研究进一步表明，这个泛化边界本身也可能被对手操纵。

### 5.2 从静态价值评分到反馈驱动的信用分配

Live-Evo 将“发生了什么”与“怎样使用它”分为 Experience Bank 和 Meta-Guideline Bank，并用持续反馈调整经验权重；MemQ 则沿记忆的来源依赖图传播信用，不只奖励当次直接检索的条目。前者更突出非平稳数据流中的有效性变化，后者更突出间接贡献的分配，两者都比纯语义相似度更接近“这段经验是否有用”的问题 [[24]](../papers/2602.02369.html)[[25]](../papers/2605.08374.html)。

但反馈加权不自动产生可靠因果解释。一个条目与成功共同出现，可能因为任务容易、检索器偏好它，或多个条目共同作用；MemQ 的来源 DAG 记录使用关系，不是安全领域中经过认证的来源权威证明。应将效用信用、事实可信度和授权资格分开建模，不让“经常帮助完成任务”成为任意行动权限的替代品 [[25]](../papers/2605.08374.html)[[24]](../papers/2602.02369.html)。

### 5.3 学习操作策略与搜索系统架构是两类问题

Memory-R1 用强化学习优化 Memory Manager 的增删改等操作和 Answer Agent 的使用行为；MemSkill 则把记忆操作组织为可学习选择、可进一步修订的技能库。前者重点是学习在已有操作集合中做什么，后者还允许调整操作知识本身；二者都涉及训练，不能与完全 training-free 的检索方法在不计训练成本的条件下比较 [[26]](../papers/2508.19828.html)[[6]](../papers/2602.02474.html)。

MemEvolve 和 ALMA 将更新对象提升到记忆设计，但搜索空间不同：MemEvolve 提供 encode/store/retrieve/manage 的模块化比较基础；ALMA 的 Meta-Agent 生成可执行代码，理论表达空间更开放；AutoMem 则显式组合 5 类编码器、5 类存储、6 类检索器和 4 类管理器，并用失败诊断指导搜索。AutoMem 当前主要搜索已知模块组合，不应被描述为已经自动发明任意新架构 [[27]](../papers/2512.18746.html)[[7]](../papers/2602.07755.html)[[28]](../papers/2608.14621.html)。

**表 2：自进化工作的差别首先在于更新对象，其次才是性能；冻结基础模型不等于整个系统不训练。**

| 工作 | 主要更新对象 | 反馈或学习方式 | 能支持的判断 | 不能直接推出的判断 |
|---|---|---|---|---|
| AWM | 可重用工作流 | 过去任务轨迹 | 程序复用有助于部分网页任务 | 已具备通用持续学习 |
| ReasoningBank | 推理经验 | 成功/失败自评；可叠加 MaTTS | 抽象教训可优于部分轨迹记忆 | 自评正确、增加计算不影响比较 |
| Live-Evo | 经验权重与指导原则 | 持续外部反馈 | 在线价值调整可适应其测试流 | 所有非平稳环境均有效 |
| MemQ | 记忆价值及来源依赖 | 沿 DAG 分配信用 | 间接经验贡献值得建模 | 来源图自动保证因果性或安全性 |
| Memory-R1 | 记忆管理和回答策略 | outcome-driven RL | 记忆操作可以训练 | 系统无需训练 |
| MemSkill | 选择控制器与记忆技能库 | RL＋难例驱动技能修订 | 不只学习选操作，也学习改操作 | 无监督部署时仍有同等反馈 |
| MemEvolve | 经验及记忆架构 | 模块化元演化 | 架构可随任务需求优化 | 统一架构对所有任务最优 |
| ALMA | 代码表达的记忆设计 | Meta-Agent 提案与评测 | 可以自动搜索记忆实现 | 外层改进机制已开放式自我改写 |
| AutoMem | 编码/存储/检索/管理组合 | 失败定位与文本反馈 | 已知组件组合存在任务依赖收益 | 已超出预定义搜索空间 |
| Recuris | 工作状态与经验/技能控制层 | 固定 Meta-Agent、局部补丁和验证 | 状态约束的技能调用可改善长任务 | 已实现无限制 RSI |

### 5.4 工作记忆与长期经验之间需要显式连接

Recuris 将 Working Memory 的任务进度用于选择 Experiential Memory 中的技能，并让结构化执行证据支持局部更新。这比在任务开始时一次性检索经验更强调执行中的状态变化；与 ALMA 搜索记忆实现相比，它重点在工作状态、技能调用和受验证更新之间的连接 [[29]](../papers/2608.24876.html)[[7]](../papers/2602.07755.html)。

原文明确指出 Recuris 的基础模型和外层改进流程保持固定，递归发生在外部记忆控制层。与此同时，关于 RSI 的综述把“系统组件的改进”与“改进机制自身可被改进”区分开。因此，更稳妥的说法是它展示了**有界的记忆控制层演化**，而不是已经实现开放式递归自我改进 [[29]](../papers/2608.24876.html)[[30]](../papers/preprints202608.0051.html)。

COVE 进一步研究外部记忆/技能与参数学习的协调；δ-mem 则以在线关联状态对注意力计算提供修正。二者说明“记忆只能是可读文本”不是必要前提，但也意味着可解释性、访问接口和遗忘方式会改变：能删除一段外部技能，并不等于能够同样直接删除已经内化到参数或潜在状态中的影响 [[31]](../papers/2608.01234.html)[[32]](../papers/2605.12357.html)。

## 6. 多模态记忆：记住看过什么，与学会怎样看不同

### 6.1 多模态历史检索关注证据定位

MIRIX 用多类记忆和多个管理 Agent 组织长期用户数据；V-Mem 则集中处理查询模态与目标证据模态不一致造成的检索偏差；GraphMemix 在问题到来后构造查询相关证据森林，以预算约束选择互补证据。它们分别解决管理分工、跨模态匹配和证据组合，不是同一种机制的简单复杂化 [[33]](../papers/2507.07957.html)[[34]](../papers/2608.01543.html)[[35]](../papers/2608.26983.html)。

V-Mem 所强调的“相似但不相关”问题，在 GraphMemix 中表现为单个高相似条目不足以提供完整答案；而 Omni-SimpleMem 同时涉及多模态记忆系统和自动研究流程。后者的改进还包含数据管线修复和提示优化，不能把从弱初始配置获得的大幅提升全部归因于某一种记忆结构 [[34]](../papers/2608.01543.html)[[35]](../papers/2608.26983.html)[[36]](../papers/2604.01007.html)。

### 6.2 多模态经验学习关注错误和技能

ViLoMem 将视觉分心模式与逻辑错误分开记忆，使之后的问题能够借鉴“该看哪里”和“该怎样推理”；AtlasVA 则保留空间热图、视觉实例和符号技能，并将轨迹统计形成的空间信息用于强化学习奖励塑形。前者偏向多模态问答中的错误经验，后者偏向视觉空间决策，不能因二者都包含图像而在同一排行榜上推断优劣 [[37]](../papers/2511.21678.html)[[38]](../papers/2605.17933.html)。

DG-Mem 将训练期轨迹产生的实例与类别规则分开，并对检索规则做贡献归因；其测试记忆是只读的。相较于 ViLoMem 的逐步 grow-and-refine 叙述，这一区别直接影响实验解释：**离线构建后复用的收益不是部署中在线学习的证据** [[39]](../papers/2608.23268.html)[[37]](../papers/2511.21678.html)。

**表 3：多模态记忆至少包含“找回历史证据”和“迁移视觉经验”两种目标，需要不同评测。**

| 工作 | 核心目标 | 记忆或机制 | 最应核查的实验条件 |
|---|---|---|---|
| MIRIX | 长期用户信息组织 | 多类记忆、多管理 Agent | 数据规模、视觉输入保留方式、管理成本 |
| V-Mem | 找到正确模态的证据 | 模态路由、查询锚点、同轮证据关联 | 是否只是检索改善，是否包含在线学习 |
| GraphMemix | 构造完整且不冗余的证据上下文 | 查询相关图扩展与证据森林选择 | 证据预算、验证调用、生命周期成本 |
| ViLoMem | 减少重复视觉/逻辑错误 | 双流错误模式和指导语 | 反馈是否使用 ground truth、基线提示是否一致 |
| AtlasVA | 复用空间决策经验 | 热图、实例、符号技能 | RL 训练预算、环境及空间任务迁移 |
| DG-Mem | 复用实例与类别规律 | 双粒度记忆、规则贡献归因 | 训练/测试分离；测试只读不能算在线更新 |
| MMA | 避免对不可靠记忆过度自信 | 来源、时间与冲突相关可靠性评分 | 拒答覆盖率、合成冲突是否代表部署分布 |

MMA 将记忆可靠性与拒答引入多模态推断，而 ViLoMem 主要研究错误经验如何帮助未来求解。这里不能把“更常回答正确”和“知道何时不回答”当成同一个指标；也不能把多个相互复制的记忆节点当成独立来源投票 [[40]](../papers/2602.16493.html)[[37]](../papers/2511.21678.html)。

还需特别指出：所读 ViLoMem 版本的方法中，验证与错误归因使用参考答案。由此得到的是在相应反馈协议下的经验学习证据，不是无标签线上场景中的自主纠错证明；部分基线来自外部报告，比较时还应优先看同提示、同模型的实测对照，而非只引用最大涨幅。

## 7. 评测证据：什么时候记忆真正有用

### 7.1 不同 benchmark 测的是不同能力

LoCoMo 主要建立长程多会话理解任务；LongMemEval 显式覆盖信息抽取、多会话推理、时间推理、知识更新和拒答。后者因此不能被笼统说成“只测静态检索”；但两者的问答表现都不足以直接证明交互式工具执行会变得更可靠 [[41]](../papers/2402.17753.html)[[42]](../papers/2410.10813.html)。

MemoryAgentBench 通过增量多轮输入评估准确检索、测试时学习、长程理解和选择性遗忘；MemBench 区分事实与反思记忆，并考察有效性、效率和容量；Evo-Memory 则将任务排列成持续流，评估经验的积累与复用。它们分别补足动态输入、记忆层次和跨任务学习，但名字相似并不代表评测对象相同 [[43]](../papers/2507.05257.html)[[44]](../papers/2506.21605.html)[[45]](../papers/2511.20857.html)。

EvoMemBench 用 episode 内/跨 episode、知识导向/执行导向两条轴组织评测；HaluMem 则定位抽取、更新和问答阶段的幻觉。相较于只给最终答案评分，前者揭示记忆是否匹配任务结构，后者帮助判断错误是在写入还是使用时产生 [[46]](../papers/2605.18421.html)[[47]](../papers/2511.03506.html)。

**表 4：高问答分数、持续学习能力和安全记忆不是同一项能力。**

| 评测 | 主要测量对象 | 适合回答的问题 | 不能单独证明 |
|---|---|---|---|
| LoCoMo | 长程多会话理解 | 能否回忆、组合对话事件 | 长期开放环境执行与安全性 |
| LongMemEval | 抽取、时序、更新、跨会话推理、拒答 | 能否维护动态用户知识 | 技能迁移和持续工具执行 |
| MemoryAgentBench | 增量输入下的四类记忆能力 | 是否只擅长检索、能否更新旧信息 | 隐私删除已完成或所有行动均安全 |
| MemBench | 事实/反思记忆，效果/效率/容量 | 不同记忆层次的能力如何 | 无界任务流持续改进 |
| Evo-Memory | 流式任务中的经验复用与更新 | 是否能从先前任务获益 | 任意真实分布漂移下均有效 |
| EvoMemBench | episode 内/跨 episode，知识/执行 | 记忆形式与任务需求是否匹配 | 所有部署任务存在统一最优方法 |
| HaluMem | 抽取、更新、问答的操作级错误 | 错误何时进入并传播 | 授权语义和攻击鲁棒性 |

### 7.2 支持性证据与反证应当同时保留

Mem0、Hindsight 等报告了相对其全文上下文基线的性能或成本收益；但 RecMem 在 LoCoMo 上仍被全文上下文略微超过，EvoMemBench 也显示记忆在简单任务上可能降低准确率。这不是应当抹平的矛盾，而是任务条件不同：当原始历史能够直接进入上下文且足以解决问题时，抽取和检索可能引入额外失真；当历史太长、证据分散或需要复用程序时，结构化记忆的价值更容易体现 [[11]](../papers/2504.19413.html)[[13]](../papers/2512.12818.html)[[14]](../papers/2605.16045.html)[[46]](../papers/2605.18421.html)。

Lost in the Middle 提供了早期模型对长上下文利用不均匀的证据，但不能据此宣布 2026 年所有长上下文模型都具有相同程度的缺陷。判断新记忆系统的增益必须重新运行当前强模型基线；历史发现解释研究动机，不能替代当前实验 [[48]](../papers/2307.03172.html)[[46]](../papers/2605.18421.html)。

**表 5：以下是各原论文条件内的结果，不是跨论文排行榜。数值只用于展示收益及其边界。**

| 论文与设置 | 原文报告 | 合理解释与边界 |
|---|---|---|
| RecMem，LoCoMo，GPT-4.1-mini | 平均每会话构建 token 为 193.2K；Mem0 为 1520.8K，减少约 87.3% | 这是构建阶段，不是每次查询或完整生命周期都降低 87.3%；Full Context 在该设置下仍略优 |
| RecMem，LongMemEval-S，同一骨干 | 相对 Mem0 构建 token 减少 77.5%，总体得分为其比较方法中最高 | 支持更长历史下的成本—效果折中，不代表所有类别均最优 |
| EvoMemBench，跨 episode 知识任务 Easy 划分 | 无记忆 DeepSeek-V3.2 为 52.1；最佳记忆方法 Qwen3-Emb-4B 检索为 50.0 | 同骨干条件下可以出现负收益；这里后者是检索组件，不是将骨干替换成 4B 模型 |
| EvoMemBench，同设置 Hard 划分 | 无记忆为 0.0，ACE 为 13.0，BM25 为 10.1 | 困难划分中记忆有帮助，但绝对表现仍低，不能包装成问题已解决 |
| ALMA，四个文本交互环境 | 学习集/测试集分离，并分别划分记忆收集与部署阶段，部署重复三次 | 比直接在同一任务集反复挑最优设计更有说服力；仍未覆盖真实持续部署全部变化 |
| ViLoMem，所读 v2 方法 | 验证和错误归因使用 ground truth | 必须报告反馈来源，不能称为完全无监督自进化 |

### 7.3 建议采用的最小可信评测协议

上述比较提示，一项新 Agent memory 工作至少应同时包含以下控制。这是本文综合提出的实验建议，不是声称现有所有论文都已执行。

1. **强基线与预算匹配。** 同一 backbone、提示策略、工具权限和任务预算下比较无记忆、可容纳时的完整上下文、滑动窗口/摘要、BM25/向量检索，以及目标记忆系统。因上下文不足而截断的基线必须明示，不能称为完整上下文。
2. **严格时间顺序。** 当前任务先预测、评分，再允许用已声明的反馈更新未来任务记忆；禁止当前答案经记忆更新回流到当前任务的预测。跨任务共享状态和跨用户隔离规则应公开。
3. **反馈可见性对齐。** 区分真实工具返回、可执行验证器、人类反馈、LLM 自评和参考答案；ViLoMem 式有参考答案的协议不能与仅自评的系统直接认定能力高低。
4. **增益归因。** 分离更好的记忆、更多采样、更强检索模型、额外 RL 训练以及架构搜索预算；ReasoningBank 与 MaTTS 应拆开报告，Memory-R1 和 MemSkill 应计入训练资源。
5. **全生命周期成本。** 分别报告构建、检索、读取、整合、验证、架构搜索和存储成本，并给出历史长度与查询频率。便宜的查询可能由昂贵的离线维护换来。
6. **纵向而非只看终点。** 多个任务顺序/随机种子，记录学习曲线、旧能力保持、负迁移、过时记忆使用和错误提交；不能把选择最优轮次的验证分数当独立测试结果。
7. **安全与效用联合评价。** 同时测错误授权、攻击持久性、删除后残留和正常任务成功率，避免把拒绝所有请求称为安全记忆。

## 8. 安全与治理：记忆既是证据，也可能变成行为规则

### 8.1 外部输入可以通过正常写入流程长期生效

MINJA 展示仅通过查询交互影响记忆的风险；eTAMP 和 Zombie Agents 则研究 Agent 读取不可信环境内容后，在正常记忆更新中产生跨会话影响。关键差异在于攻击者控制什么：用户查询、网页观察还是记忆文件。必须按权限和可见性区分威胁模型，不能将最高攻击成功率跨论文排列 [[49]](../papers/2503.03704.html)[[50]](../papers/2604.02623.html)[[51]](../papers/2602.15654.html)。

*Hidden in Memory* 强调先写入、后检索、再触发的延迟过程，而 *Bad Memory* 在所测系统中观察到：诱导 Agent 覆盖自身记忆较难，但已经植入记忆文件的载荷仍可能跨会话生效。这说明**写入成功、被检索和最终行动成功是不同分母**；不能因为一项研究测得读取后的高危行为，就假定现实攻击者容易取得写入能力 [[52]](../papers/2605.15338.html)[[53]](../papers/2607.14611.html)。

### 8.2 从经验到技能的升级扩大了攻击持续性

SkillJack 关注有害经验被抽象为持久技能后，即使删除原记录仍能持续影响行为；PoisonedEvolution 则强调轨迹在技能演化中被当成因果上有用、反复出现且可泛化的证据。它们与普通检索投毒的区别在于，对手影响的不只是一次上下文，而是后续任务可能反复调用的行为制品 [[54]](../papers/2608.03509.html)[[55]](../papers/2608.05563.html)。

OEP 更进一步指出，经验可以局部正确却不可迁移，从而诱发不恰当的一般规则；这与 ReasoningBank 和 Trace2Skill 希望从成功/失败中归纳通用教训的目标形成直接张力。风险不只是记住了一句显式恶意命令，也可能是从真实但特殊的例子中学到错误原则 [[56]](../papers/2605.18930.html)[[20]](../papers/2509.25140.html)[[22]](../papers/2603.25158.html)。

在多模态场景，MemVenom 与 Lucid 分别研究多模态记忆污染和受限图像通道下的攻击。二者的控制权限与目标不同，不能合并解释为“所有多模态记忆都可被同一种方式控制”；它们共同要求评测写入、检索和视觉解释各环节，而非只扫描文本 [[57]](../papers/2606.10742.html)[[58]](../papers/2607.15657.html)。

### 8.3 没有攻击者也可能产生错误授权

AuthMem-Bench 固定内容主张和下游任务，仅改变来源权威，研究整合过程是否把低权限来源升级成可执行指令；EAL-Bench 则跟踪正常历史中权限授予、范围变化、替换和撤销经过反复更新后是否仍正确。前者更像“来源边界是否保留”，后者更像“授权状态机是否被正确记忆” [[59]](../papers/2608.01679.html)[[60]](../papers/2609.01836.html)。

两者的防御结果也不能简单统一。AuthMem-Bench 的特定端到端设置中，自动持久化 authority 标签将未经授权行动率从 16.9% 降到观察到的 0.0%，正常成功率基本不变；EAL-Bench 则发现来源约束和事件溯源虽然减少错误授权，也会拒绝更多合法行动。区别在于后者还涉及范围、有效期和撤销等动态状态。**保存来源标签是重要步骤，但不能直接替代完整权限状态维护**；有限样本中的零事件也不等于普遍安全保证 [[59]](../papers/2608.01679.html)[[60]](../papers/2609.01836.html)。

### 8.4 忠实更新、安全授权和可靠接受是不同保证

TrustMem 对每次记忆状态变化评价 coverage、preservation、faithfulness，并以偏好引导的 RL 改善更新；A-MemGuard 通过多条记忆的推理一致性与独立教训记忆缓解错误循环。两者分别作用于写入可靠性与使用阶段的自检，但“忠实保存来源内容”不保证内容真实，“多个相关记忆一致”也不保证来源独立或有权授权 [[61]](../papers/2606.25161.html)[[62]](../papers/2510.02373.html)。

关于 origin-bound authority 的形式化工作尝试把安全性建立在非可篡改的来源约束上；SafeEvolve 则将安全经验转化为 harness 更新，并与策略训练结合。前者的保证依赖其形式化系统与威胁模型，后者的证据来自特定安全—效用实验；二者都不能替代对真实工具访问控制和部署实现的审计 [[63]](../papers/2606.24322.html)[[64]](../papers/2609.02786.html)。

PACE 把是否接受自我修改视为序贯检验，提示反复在小验证集上接受“分数稍高”的候选会累积假改进。与 TrustMem 判断一条更新是否忠实不同，它判断候选相对当前系统是否得到足够统计支持。PACE 的理论保证是满足相应条件零假设下的**单次候选错误提交控制**，不是整段生命周期的总体安全保证，也不自动解决对验证数据的任意自适应复用 [[65]](../papers/2606.08106.html)[[61]](../papers/2606.25161.html)。

**表 6：可靠记忆需要多种互补约束；任何单一检查都不覆盖全部风险。**

| 边界 | 代表工作 | 所处理的问题 | 仍需补上的条件 |
|---|---|---|---|
| 输入→记忆 | MINJA、eTAMP、Hidden in Memory | 不可信内容沿正常流程写入 | 写入权限、跨用户隔离、延迟触发评测 |
| 记忆→技能 | SkillJack、PoisonedEvolution、OEP | 特殊或污染经验被升级为通用规则 | 适用范围、反例验证、派生制品追踪 |
| 旧记忆→新记忆 | TrustMem、HaluMem | 遗漏、破坏和无支持新增 | 验证器独立性、多模态与对抗场景 |
| 内容→行动权限 | AuthMem-Bench、EAL-Bench | 来源权威丢失和授权生命周期错误 | 范围、期限、撤销、真实工具侧强制约束 |
| 候选修改→正式版本 | PACE、SafeEvolve | 噪声改进与安全—效用折中 | 独立验证数据、跨轮次风险控制、回滚 |
| 删除源记录→清除影响 | SkillJack、MemLeak | 技能残留与跨模态重建 | 依赖追踪、行为测试、相关保留数据的处理 |

### 8.5 遗忘不是把一行数据库记录删掉

MemoryAgentBench 的选择性遗忘主要涉及冲突知识的修订，不能直接等同于隐私删除；MemLeak 则检查用户要求删除的事实能否从保留的相关文本或图像中重新推断出来。SkillJack 讨论的是来源已删除但技能仍保留污染影响，这又不同于事实重建。三种问题对应知识更新、隐私控制和行为影响撤销，应分别评测 [[43]](../papers/2507.05257.html)[[66]](../papers/2606.29788.html)[[54]](../papers/2608.03509.html)。

MemLeak 在其 300 个删除目标设置中报告，删除文本及直接关联图片后，仍有 12.0% 的事实可从其他保留图片恢复；内容感知删除将其降至 2.0%，同时移除了部分原应保留图片。该结果不是“遗忘不可能”的证明，而是特定保留政策下的残留测量。它与 SkillJack 一起说明，可验证撤销需要同时检查存储依赖和删除后的行为，但不能不计效用损失地要求删除全部相关信息 [[66]](../papers/2606.29788.html)[[54]](../papers/2608.03509.html)。

## 9. 跨方向综合：主要矛盾不在容量，而在更新质量

### 9.1 压缩、抽象和治理之间存在张力

RecMem 用保留原始记录缓解抽象损失，ACE 用增量编辑避免反复重写丢失细节，AuthMem-Bench 则说明即使主张内容保留下来，来源权限也可能消失。三者共同提示：对决策有用的信息不仅是事实正文，还包括例外、时序、条件和来源。因此压缩目标不应只优化文本相似性或 token 数，应考虑未来决策是否仍能区分关键状态 [[14]](../papers/2605.16045.html)[[21]](../papers/2510.04618.html)[[59]](../papers/2608.01679.html)。

### 9.2 更多复用既能降低成本，也可能放大错误

ReasoningBank、AWM 的收益依赖经验反复使用；SkillJack 和 OEP 的风险也依赖污染或过度泛化后的经验反复使用。它们不是彼此无关的性能线和安全线，而是共享同一条“经验影响后续行为”的机制。更合理的目标是提高**有效且适用的复用**，而不是最大化复用次数 [[20]](../papers/2509.25140.html)[[19]](../papers/2409.07429.html)[[54]](../papers/2608.03509.html)[[56]](../papers/2605.18930.html)。

### 9.3 “让系统自己评价自己”是共同瓶颈

ReasoningBank 使用自评，MemSkill 用难例推动技能演化，ALMA 和 AutoMem 用候选评测指导架构搜索。虽然反馈形态不同，它们都依赖评价信号与真实任务价值的联系；PACE 所指出的错误接受问题说明，即使候选生成机制合理，也会因噪声和反复选择得到不稳健的改进。应把提案器、评估器和接受规则分别分析，而不是把循环次数当作进化强度 [[20]](../papers/2509.25140.html)[[6]](../papers/2602.02474.html)[[7]](../papers/2602.07755.html)[[28]](../papers/2608.14621.html)[[65]](../papers/2606.08106.html)。

### 9.4 安全风险不能被写成必然失控

原收藏中有大量攻击工作，容易使综述过度偏向风险叙事。*Bad Memory* 中写入和利用难度并不相同；*Mind Viruses* 的所测多 Agent 设置也报告，简短警示可显著抑制传播，且有害目标通常更难传播。这些结果不否认长期污染风险，但要求把攻击可达性、系统配置与防护条件明确写出来，不能只保留攻击成功的案例 [[53]](../papers/2607.14611.html)[[67]](../papers/2608.10218.html)。

## 10. 研究空白与可检验方向

以下是基于本次检索得到的候选研究问题，**不是“无人做过”的查新结论**。已有来源约束、可验证更新、反馈加权及遗忘研究，新的工作必须在这些基础上建立明确差异。

### 10.1 范围敏感的经验晋升，而非重复出现即升级

RecMem 依据重复决定整合时机，Trace2Skill 从多轨迹归纳程序，OEP 和 PoisonedEvolution 则说明局部正确或反复出现的证据可能诱发错误一般化 [[14]](../papers/2605.16045.html)[[22]](../papers/2603.25158.html)[[56]](../papers/2605.18930.html)[[55]](../papers/2608.05563.html)。值得研究的问题是：经验进入全局技能前，是否必须明确其前提、反例和失败边界？

可检验设计是先保留带条件的候选经验，再通过条件扰动和反例任务决定其适用范围；与“立即升级”“按频率升级”“只做文字安全审核”比较。主要指标应包括新任务净收益、范围外错误调用、罕见正确经验的保留率及验证成本。创新不能只是增加一个通用 verifier，而应证明适用范围判别比更强过滤或更多采样带来独立收益。

### 10.2 区分任务效用、证据可信度和授权资格

Live-Evo、MemQ 研究经验对任务的贡献，MMA 研究证据可靠性，AuthMem-Bench 与 EAL-Bench 研究授权状态。这几种信号的作用不同，单一“memory score”可能把它们混合 [[24]](../papers/2602.02369.html)[[25]](../papers/2605.08374.html)[[40]](../papers/2602.16493.html)[[59]](../papers/2608.01679.html)[[60]](../papers/2609.01836.html)。

可以构造配对任务：同一记忆在事实层面正确，但权限不同；权限相同，但已过时；多条记录一致，但来自同一个不可信来源。研究目标不是设计一个更大的总分，而是比较分开约束是否降低未经授权行动，同时避免过度拒绝正常任务。这一方向已有近邻工作，重点应落在动态作用域、撤销传播或预算受限验证等更具体缺口。

### 10.3 可撤销的多模态经验与技能

DG-Mem、ViLoMem 体现实例到规则的抽象，SkillJack 显示派生技能可在源记录删除后继续生效，MemLeak 则指出保留模态中的相关证据还可能重建被删除事实 [[39]](../papers/2608.23268.html)[[37]](../papers/2511.21678.html)[[54]](../papers/2608.03509.html)[[66]](../papers/2606.29788.html)。因此，仅实现引用关系级联删除还不够：未直接引用的相关证据也可能产生影响。

一个明确研究问题是：在保留正常任务效用的约束下，能否联合使用依赖追踪与删除后行为探测，定位应撤销的摘要、规则、图像或技能？评测应报告删除目标恢复率、污染行为残留、无关能力下降和审计成本，区分“删除制品”与“撤销其可观察影响”。

### 10.4 将记忆效用与风险放到同一长期任务流

Evo-Memory 和 EvoMemBench 关注经验带来的效用，HaluMem 和授权评测关注错误状态；现有结果尚不足以让我们知道，一个系统在长时间学习、漂移、冲突和少量污染共同存在时如何变化 [[45]](../papers/2511.20857.html)[[46]](../papers/2605.18421.html)[[47]](../papers/2511.03506.html)[[60]](../papers/2609.01836.html)。

有价值的评测可以顺序加入新工具、规则变化、权限撤销、低频关键约束和少量不可信交互，再继续运行正常任务。需要同时记录任务成功、错误授权、记忆增长、错误持续时间、回滚效果和累计成本。若只增加静态攻击集，而没有真实状态更新和后续任务，就没有检验长期记忆特有的问题。

### 10.5 学会“不使用记忆”与延迟整合

EvoMemBench 的负收益和 RecMem 的成本结果提示，最优策略有时是直接使用当前上下文，或暂缓抽象，而不是总调用最复杂记忆模块。AutoMem 当前主要做任务分布级架构搜索，也为 episode 级决策留下空间 [[46]](../papers/2605.18421.html)[[14]](../papers/2605.16045.html)[[28]](../papers/2608.14621.html)。

可比较一个轻量决策器在“不检索、检索原始记录、读取摘要、调用技能、触发整合”之间选择，目标是在相同生命周期预算下获得更高净效用。必要对照是固定最佳策略、随机路由、仅按输入长度路由，以及一个用于分析而非实际部署的 oracle 上界；否则收益可能只是少花了计算或减少了无关上下文。

对当前收藏分布而言，**“经验何时升级为技能”及“升级后如何验证和撤销”最适合作为进一步选题的集中切入点**：它连接了已有自进化与安全阅读积累，也能与普通 memory QA 拉开差异。但是否构成可发表的新问题，仍需更窄范围的查新和小规模对照实验。

## 11. 结论

**对 RQ1，** Agent memory 已形成从事实维护、经验归纳到记忆操作学习和架构搜索的多层路线。比较的关键不是名称是否带有 agentic 或 self-evolving，而是记忆存储什么、谁能修改它、何种反馈驱动修改，以及修改是否改变后续控制过程。

**对 RQ2，** 记忆的收益是条件性的。长历史、分散证据、困难任务和可复用程序更容易体现收益；当前上下文已充分或历史经验不匹配时，记忆也会增加噪声。可信结论必须建立在同骨干、时间顺序正确、反馈可见性和预算匹配的比较上，并同时衡量构建和使用成本。

**对 RQ3，** 长期记忆既可能积累能力，也可能积累错误和错误授权。可靠系统需要区别事实忠实性、经验适用性、来源权威及修改接受的统计依据，并支持跨摘要、技能和模态的影响撤销。本文的主要综合判断是：**下一阶段的 Agent memory 研究应从“让 Agent 记得更多”转向“让它有依据地改变长期状态，并能说明、验证和撤销这种改变”。**

## 参考文献

[[1]](../papers/2309.02427.html) Theodore R. Sumers, Shunyu Yao, Karthik Narasimhan, et al., "Cognitive Architectures for Language Agents," arXiv:2309.02427, 2023.

[[2]](../papers/2602.06052.html) Wei-Chieh Huang, Weizhi Zhang, Yueqing Liang, et al., "A Survey of Agent Memory in the Second Half: Towards Self-Evolving and Long-Horizon Agents," arXiv:2602.06052, 2026.

[[3]](../papers/2005.11401.html) Patrick Lewis, Ethan Perez, Aleksandra Piktus, et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," arXiv:2005.11401, 2020.

[[4]](../papers/2604.08224.html) Chenyu Zhou, Huacan Chai, Wenteng Chen, et al., "Externalization in LLM Agents: A Unified Review of Memory, Skills, Protocols and Harness Engineering," arXiv:2604.08224, 2026.

[[5]](../papers/2502.12110.html) Wujiang Xu, Zujie Liang, Kai Mei, et al., "A-MEM: Agentic Memory for LLM Agents," arXiv:2502.12110, 2025.

[[6]](../papers/2602.02474.html) Haozhen Zhang, Quanyu Long, Jianzhu Bao, et al., "MemSkill: Learning and Evolving Memory Skills for Self-Evolving Agents," arXiv:2602.02474, 2026.

[[7]](../papers/2602.07755.html) Yiming Xiong, Shengran Hu, Jeff Clune, "Learning to Continually Learn via Meta-learning Agentic Memory Designs," arXiv:2602.07755, 2026.

[[8]](../papers/2304.03442.html) Joon Sung Park, Joseph C. O'Brien, Carrie J. Cai, et al., "Generative Agents: Interactive Simulacra of Human Behavior," arXiv:2304.03442, 2023.

[[9]](../papers/2310.08560.html) Charles Packer, Sarah Wooders, Kevin Lin, et al., "MemGPT: Towards LLMs as Operating Systems," arXiv:2310.08560, 2023.

[[10]](../papers/2305.10250.html) Wanjun Zhong, Lianghong Guo, Qiqi Gao, et al., "MemoryBank: Enhancing Large Language Models with Long-Term Memory," arXiv:2305.10250, 2023.

[[11]](../papers/2504.19413.html) Prateek Chhikara, Dev Khant, Saket Aryan, et al., "Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory," arXiv:2504.19413, 2025.

[[12]](../papers/2501.13956.html) Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, et al., "Zep: A Temporal Knowledge Graph Architecture for Agent Memory," arXiv:2501.13956, 2025.

[[13]](../papers/2512.12818.html) Chris Latimer, Nicoló Boschi, Andrew Neeser, et al., "Hindsight is 20/20: Building Agent Memory that Retains, Recalls, and Reflects," arXiv:2512.12818, 2025.

[[14]](../papers/2605.16045.html) Zijie Dai, Shiyuan Deng, Sheng Guan, et al., "RecMem: Recurrence-based Memory Consolidation for Efficient and Effective Long-Running LLM Agents," Findings of ACL, 2026.

[[15]](../papers/2601.02553.html) Jiaqi Liu, Yaofeng Su, Peng Xia, et al., "SimpleMem: Efficient Lifelong Memory for LLM Agents," arXiv:2601.02553, 2026.

[[16]](../papers/2606.10677.html) Suozhao Ji, Baodong Wu, Zehao Wang, et al., "Infini Memory: Maintainable Topic Documents for Long-Term LLM Agent Memory," arXiv:2606.10677, 2026.

[[17]](../papers/2303.11366.html) Noah Shinn, Federico Cassano, Edward Berman, et al., "Reflexion: Language Agents with Verbal Reinforcement Learning," arXiv:2303.11366, 2023.

[[18]](../papers/2305.16291.html) Guanzhi Wang, Yuqi Xie, Yunfan Jiang, et al., "Voyager: An Open-Ended Embodied Agent with Large Language Models," arXiv:2305.16291, 2023.

[[19]](../papers/2409.07429.html) Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, et al., "Agent Workflow Memory," arXiv:2409.07429, 2024.

[[20]](../papers/2509.25140.html) Siru Ouyang, Jun Yan, I-Hung Hsu, et al., "ReasoningBank: Scaling Agent Self-Evolving with Reasoning Memory," arXiv:2509.25140, 2025.

[[21]](../papers/2510.04618.html) Qizheng Zhang, Changran Hu, Shubhangi Upasani, et al., "Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models," arXiv:2510.04618, 2025.

[[22]](../papers/2603.25158.html) Jingwei Ni, Yihao Liu, Xinpeng Liu, et al., "Trace2Skill: Distill Trajectory-Local Lessons into Transferable Agent Skills," arXiv:2603.25158, 2026.

[[23]](../papers/2606.03083.html) Haoran Tan, Zeyu Zhang, Zhicheng Cao, et al., "DELTAMEM: Incremental Experience Memory for LLM Agents via Residual Trees," arXiv:2606.03083, 2026.

[[24]](../papers/2602.02369.html) Yaolun Zhang, Yiran Wu, Yijiong Yu, et al., "Live-Evo: Online Evolution of Agentic Memory from Continuous Feedback," arXiv:2602.02369, 2026.

[[25]](../papers/2605.08374.html) Junwei Liao, Haoting Shi, Ruiwen Zhou, et al., "MemQ: Integrating Q-Learning into Self-Evolving Memory Agents over Provenance DAGs," arXiv:2605.08374, 2026.

[[26]](../papers/2508.19828.html) Sikuan Yan, Xiufeng Yang, Zuchao Huang, et al., "Memory-R1: Enhancing Large Language Model Agents to Manage and Utilize Memories via Reinforcement Learning," arXiv:2508.19828, 2025.

[[27]](../papers/2512.18746.html) Guibin Zhang, Haotian Ren, Chong Zhan, et al., "MemEvolve: Meta-Evolution of Agent Memory Systems," arXiv:2512.18746, 2025.

[[28]](../papers/2608.14621.html) Lin Du, Jie Zhou, Yuxuan Cai, et al., "AutoMem: A Text-Gradient Recursive Self-Improvement Framework for Automated Memory Architectures Search," arXiv:2608.14621, 2026.

[[29]](../papers/2608.24876.html) Zhaochen Yu, Yingcheng Wu, Zhenfei Yin, et al., "Recursive Experiential-Working Memory Evolution for Long-Horizon Agent Harnesses," arXiv:2608.24876, 2026.

[[30]](../papers/preprints202608.0051.html) Shuaiqi Liu, Zhengkai Lin, Yuxiang Zhang, et al., "The Path to Recursive Self-Improving Agents: Foundation, Framework, and Future Directions," Preprints:202608.0051.v1, 2026.

[[31]](../papers/2608.01234.html) Tianyun Ji, Zhenya Huang, Jiayu Liu, et al., "Learning What to Remember and What to Internalize in LLM Self-Evolution via Adaptive Memory-Parameter Coordination," arXiv:2608.01234, 2026.

[[32]](../papers/2605.12357.html) Jingdi Lei, Di Zhang, Junxian Li, et al., "$\delta$-mem: Efficient Online Memory for Large Language Models," arXiv:2605.12357, 2026.

[[33]](../papers/2507.07957.html) Yu Wang, Xi Chen, "MIRIX: Multi-Agent Memory System for LLM-Based Agents," arXiv:2507.07957, 2025.

[[34]](../papers/2608.01543.html) Dingyi Kang, Dongming Jiang, Yi Li, et al., "V-Mem: Modality-Routed Retrieval for Long-Term Multimodal Agentic Memory," arXiv:2608.01543, 2026.

[[35]](../papers/2608.26983.html) Geng Li, Yuhao Wang, Dong Li, et al., "GraphMemix: Query-Aware Evidence Forests for Long-Term Multimodal Agent Memory," arXiv:2608.26983, 2026.

[[36]](../papers/2604.01007.html) Jiaqi Liu, Zipeng Ling, Shi Qiu, et al., "Omni-SimpleMem: Autoresearch-Guided Discovery of Lifelong Multimodal Agent Memory," arXiv:2604.01007, 2026.

[[37]](../papers/2511.21678.html) Weihao Bo, Shan Zhang, Yanpeng Sun, et al., "Agentic Learner with Grow-and-Refine Multimodal Semantic Memory," arXiv:2511.21678, 2025.

[[38]](../papers/2605.17933.html) Pan Wang, Yihao Hu, Xiujin Liu, et al., "AtlasVA: Self-Evolving Visual Skill Memory for Teacher-Free VLM Agents," arXiv:2605.17933, 2026.

[[39]](../papers/2608.23268.html) Jieke Wang, Tiancheng Shen, Yibo Yang, et al., "Dual-Grained Agent Memory and Shapley Context Attribution for Multimodal Agentic Learner," arXiv:2608.23268, 2026.

[[40]](../papers/2602.16493.html) Yihao Lu, Wanru Cheng, Zeyu Zhang, et al., "MMA: Multimodal Memory Agent," arXiv:2602.16493, 2026.

[[41]](../papers/2402.17753.html) Adyasha Maharana, Dong-Ho Lee, Sergey Tulyakov, et al., "Evaluating Very Long-Term Conversational Memory of LLM Agents," arXiv:2402.17753, 2024.

[[42]](../papers/2410.10813.html) Di Wu, Hongwei Wang, Wenhao Yu, et al., "LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory," arXiv:2410.10813, 2024.

[[43]](../papers/2507.05257.html) Yuanzhe Hu, Yu Wang, Julian McAuley, "Evaluating Memory in LLM Agents via Incremental Multi-Turn Interactions," arXiv:2507.05257, 2025.

[[44]](../papers/2506.21605.html) Haoran Tan, Zeyu Zhang, Chen Ma, et al., "MemBench: Towards More Comprehensive Evaluation on the Memory of LLM-based Agents," arXiv:2506.21605, 2025.

[[45]](../papers/2511.20857.html) Tianxin Wei, Noveen Sachdeva, Benjamin Coleman, et al., "Evo-Memory: Benchmarking LLM Agent Test-time Learning with Self-Evolving Memory," arXiv:2511.20857, 2025.

[[46]](../papers/2605.18421.html) Yuyao Wang, Zhongjian Zhang, Mo Chi, et al., "EvoMemBench: Benchmarking Agent Memory from a Self-Evolving Perspective," arXiv:2605.18421, 2026.

[[47]](../papers/2511.03506.html) Ding Chen, Simin Niu, Kehang Li, et al., "HaluMem: Evaluating Hallucinations in Memory Systems of Agents," arXiv:2511.03506, 2025.

[[48]](../papers/2307.03172.html) Nelson F. Liu, Kevin Lin, John Hewitt, et al., "Lost in the Middle: How Language Models Use Long Contexts," arXiv:2307.03172, 2023.

[[49]](../papers/2503.03704.html) Shen Dong, Shaochen Xu, Pengfei He, et al., "Memory Injection Attacks on LLM Agents via Query-Only Interaction," NeurIPS, 2025.

[[50]](../papers/2604.02623.html) Wei Zou, Mingwen Dong, Miguel Romero Calvo, et al., "Poison Once, Exploit Forever: Environment-Injected Memory Poisoning Attacks on Web Agents," arXiv:2604.02623, 2026.

[[51]](../papers/2602.15654.html) Xianglin Yang, Yufei He, Shuo Ji, et al., "Zombie Agents: Persistent Control of Self-Evolving LLM Agents via Self-Reinforcing Injections," arXiv:2602.15654, 2026.

[[52]](../papers/2605.15338.html) Sidharth Pulipaka, Stanislau Hlebik, Leonidas Raghav, et al., "Hidden in Memory: Sleeper Memory Poisoning in LLM Agents," arXiv:2605.15338, 2026.

[[53]](../papers/2607.14611.html) Soham Gadgil, David Alexander, Sai Sunku, et al., "Bad Memory: Evaluating Prompt Injection Risks from Memory in Agentic Systems," arXiv:2607.14611, 2026.

[[54]](../papers/2608.03509.html) Zonghao Ying, Xiangfan Wu, Huiyu Wu, et al., "SkillJack: Persistent Skill Backdoors in Self-Evolving Agents," arXiv:2608.03509, 2026.

[[55]](../papers/2608.05563.html) Jialuo Chen, Lingqi Jiang, Xinhao Deng, et al., "When Experience Becomes Instruction: Trajectory Poisoning in Self-Evolving Agent Skill Systems," arXiv:2608.05563, 2026.

[[56]](../papers/2605.18930.html) Kaixiang Wang, Jiong Lou, Zhaojiacheng Zhou, et al., "OEP: Poisoning Self-Evolving LLM Agents via Locally Correct but Non-Transferable Experiences," arXiv:2605.18930, 2026.

[[57]](../papers/2606.10742.html) Yv Zhang, Hao Sun, Hao Fang, et al., "MemVenom: Triggered Poisoning of Multimodal Memories in Web Agents," arXiv:2606.10742, 2026.

[[58]](../papers/2607.15657.html) Halima Bouzidi, Mboutidem Ekemini Mkpong, Mohammad Abdullah Al Faruque, "Do Agents Dream of False Memories? Black-box Visual Attacks on Long-term Memory in Multimodal AI Agents," arXiv:2607.15657, 2026.

[[59]](../papers/2608.01679.html) Qiuyang Zhan, Rui Zhang, Sheng Guo, et al., "When Memory Becomes Authority: Benchmarking Authority Collapse at the Memory Consolidation Boundary," arXiv:2608.01679, 2026.

[[60]](../papers/2609.01836.html) Tommaso Cerruti, Mika Okamoto, Ansel Kaplan Erol, "Agent Memory Is a Surface for Endogenous Authorization Laundering," arXiv:2609.01836, 2026.

[[61]](../papers/2606.25161.html) Tianyu Yang, Sudipta Paul, Vijay Srinivasan, et al., "TRUSTMEM: Learning Trustworthy Memory Consolidation for LLM Agents with Long-Term Memory," arXiv:2606.25161, 2026.

[[62]](../papers/2510.02373.html) Qianshan Wei, Tengchao Yang, Yaochen Wang, et al., "A-MemGuard: A Proactive Defense Framework for LLM-Based Agent Memory," arXiv:2510.02373, 2025.

[[63]](../papers/2606.24322.html) Yedidel Louck, "Securing LLM-Agent Long-Term Memory Against Poisoning: Non-Malleable, Origin-Bound Authority with Machine-Checked Guarantees," arXiv:2606.24322, 2026.

[[64]](../papers/2609.02786.html) Qinghua Mao, Wanying Qu, Dadi Guo, et al., "SafeEvolve: Harness-Policy Co-Evolution from Agent Experience for Safety Alignment," arXiv:2609.02786, 2026.

[[65]](../papers/2606.08106.html) Zayx Shawn, "PACE: Anytime-Valid Acceptance Tests for Self-Evolving Agents," arXiv:2606.08106, 2026.

[[66]](../papers/2606.29788.html) Kuan Wang, Chao Zhang, "MemLeak: Diagnosing Information Leaks in Multimodal Agent Memory," arXiv:2606.29788, 2026.

[[67]](../papers/2608.10218.html) Vassilis Papadopoulos, McNair Shah, Sam Zimmerman, et al., "Mind Viruses: Self-Propagating Ideas in Multi-Agent LLM Systems," arXiv:2608.10218, 2026.
