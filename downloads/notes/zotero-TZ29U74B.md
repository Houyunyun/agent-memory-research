# SCALING LLM TEST-TIME COMPUTE OPTIMALLY CAN BE MORE EFFECTIVE THAN SCALING PARAMETERS FOR REASONING

Charlie Snell, Jaehoon Lee, Kelvin Xu, Aviral Kumar · 2025

[论文原文](https://scholar.google.com/scholar?q=SCALING%20LLM%20TEST-TIME%20COMPUTE%20OPTIMALLY%20CAN%20BE%20MORE%20EFFECTIVE%20THAN%20SCALING%20PARAMETERS%20FOR%20REASONING)

## 核心机制

原收藏中的一般 test-time compute scaling 或 reward hacking 文献，保留入口以便完整追踪。

## 适用范围与局限

不在本次 Agent memory 核心候选池内；未进一步核验出版元数据或结论。

## 详细解读

### 核心总结

这篇发表于ICLR 2025的论文系统性地研究了如何在大语言模型（LLM）的推理阶段（test-time）最优地分配额外计算资源，以提升模型在数学推理任务上的表现。论文分析了两种主要的测试时计算扩展机制——基于过程奖励模型（PRM）的搜索和迭代修订（revision）——发现不同方法的有效性高度依赖于问题的难度。基于这一发现，论文提出了"计算最优"（compute-optimal）的测试时计算分配策略，即根据问题难度自适应地选择最佳策略，从而将测试时计算的效率提升4倍以上（相比best-of-N基线）。此外，在FLOPs匹配的对比实验中，论文发现在中等及较简单的问题上，给小模型增加测试时计算比直接训练一个大14倍的模型更高效，但在最困难的问题上，增加预训练计算仍然更有效。

### 详细讲解

#### 1. 研究动机与背景

论文的核心问题是：**如果给LLM一个固定但非平凡的推理时计算预算，它能在多大程度上提升在困难问题上的表现？** 这个问题不仅关乎性能，还涉及LLM预训练的未来方向——是否可以用更小的模型配合更多推理时计算来替代大模型。  
先前的研究对测试时计算的效果给出了矛盾的结论：一些工作表明LLM可以通过测试时计算改进输出（如self-critique、多智能体辩论等），但另一些工作表明这些方法在数学推理等复杂任务上效果有限。论文认为，推理任务本质上是从已有知识中进行推断，而非获取新知识，因此应该特别适合从测试时计算中获益。这种矛盾的先前发现促使了对不同测试时计算扩展方法的系统性分析。

#### 2. 统一框架：提议者与验证者

论文首先建立了一个统一的抽象框架来理解测试时计算。核心思想是：测试时计算本质上是在**自适应地修改模型在给定prompt上的输出分布**。这类似于MCMC采样——通过组合一个简单的提议分布（proposal distribution）和一个评分函数来从复杂分布中采样。  
具体来说，有两个独立的"旋钮"可以调节：  
**(1) 修改提议分布（输入层面）：** 通过在prompt中添加额外的token（如之前的错误答案），让LLM基于这些额外信息生成修改后的提议分布。具体方法包括：

- 通过RL微调（如STaR、ReST$^{EM}$）直接优化模型
- 通过self-critique让模型迭代修订自己的答案。论文特别微调了模型使其能够进行有效的迭代修订。

**(2) 优化验证者（输出层面）：** 从标准LLM中采样多个候选答案，然后用验证者/评分器进行后处理筛选。具体方法包括：

- Best-of-N采样：采样N个答案，用验证者选最好的
- 过程奖励模型（PRM）：对解答的每个中间步骤进行正确性预测，然后利用这些逐步预测进行树搜索

#### 3. 如何最优地扩展测试时计算

##### 3.1 计算最优策略的形式化定义

给定一个prompt $q$ 和计算预算 $N$，论文定义了"测试时计算最优扩展策略"。设 $\text{Target}(\theta, N, q)$ 为模型在给定prompt $q$、超参数 $\theta$、计算预算 $N$ 下的输出分布，最优策略为：  

$\displaystyle \theta^\*_{q, a^\*(q)}(N) = \arg\max_\theta \left( \mathbb{E}_{y \sim \text{Target}(\theta, N, q)} \left[ \mathbb{1}_{y = y^\*(q)} \right] \right)$

  
其中 $y^\*(q)$ 是问题 $q$ 的正确答案。关键在于：**这个最优策略是依赖于具体问题的**，不同问题可能需要不同的策略。

##### 3.2 问题难度作为最优策略的近似

直接求解上述优化问题是不现实的，论文提出用**问题难度**作为近似充分统计量。具体做法是：

- **定义难度：** 对每个测试问题，用基础LLM生成2048个样本，计算pass@1正确率，然后将所有问题按正确率分成5个分位数（quintile），对应5个难度级别。这种基于模型的难度定义比MATH数据集自带的人工标注难度更能预测测试时计算的效果。
- **Oracle难度 vs 预测难度：** Oracle难度需要访问正确答案检查器（部署时不可用）。为了实际可用，论文还提出了"模型预测难度"——用训练好的验证者对2048个样本的平均分数来估计难度，不依赖ground-truth标签。
- **使用方式：** 在验证集上，对每个难度bin和每个计算预算，预先计算各种策略的表现；对新的测试问题，先判断其难度bin，然后选择该bin中表现最好的策略。

#### 4. 实验设置

- **数据集：** MATH基准测试（高中竞赛级数学题），12k训练题 + 500测试题
- **模型：** PaLM 2-S\*（Codey），在MATH上有非平凡但未饱和的表现，适合作为测试平台

#### 5. 通过验证者扩展测试时计算

##### 5.1 PRM训练

论文采用Wang et al. (2023)的方法，不使用人工标注，而是通过**蒙特卡洛rollout**来估计每一步的正确性。具体来说，从解答的每一步出发，运行多次rollout来估计该步的reward-to-go值。PRM被训练为二分类器，在每一步预测0到1之间的值，使用软标签和二元交叉熵损失训练。  
**答案聚合方式：**

- 步骤内聚合：使用PRM在**最后一步**的预测作为整个答案的分数（而非取最小值或乘积）
- 答案间聚合：使用"best-of-N weighted"选择——将所有得到相同最终答案的解答的验证者分数求和，选择总分最高的答案

##### 5.2 搜索方法

论文比较了三种搜索方法（见Figure 2）：

1. **Best-of-N weighted：** 独立采样N个完整答案，用PRM选最好的
2. **Beam search：** 在每一步采样N个候选，用PRM评分后保留top $N/M$ 个，从每个保留的候选再采样M个下一步，重复直到完成。最终对N个候选答案做best-of-N weighted选择
3. **Lookahead search：** 在beam search的基础上，评估每一步时不直接用当前步的PRM分数，而是向前rollout $k$ 步，用rollout终点的PRM值来评估当前步。计算成本为 $N \times (k+1)$

##### 5.3 搜索结果分析

**总体比较（Figure 3左）：**

- 在低计算预算下，beam search优于best-of-N
- 在高计算预算下，beam search的优势消失甚至反转，可能是因为过度优化了PRM的预测（reward hacking）
- Lookahead search由于额外计算开销，总体表现不如其他方法

**按难度分析（Figure 3右）：** 这是论文的关键发现之一：

- **简单问题（难度1/2）：** beam search在高预算下性能退化（过度优化PRM信号），best-of-N更稳定
- **中等难度问题（难度3/4）：** beam search持续优于best-of-N
- **最难问题（难度5）：** 所有方法都无法取得有意义的进展  
  直觉解释：简单问题上验证者的判断大多正确，进一步优化只会放大验证者学到的虚假特征；困难问题上模型不太可能直接采样到正确答案，搜索可以帮助引导模型。

**计算最优搜索（Figure 4）：** 根据问题难度在best-of-N和beam search之间选择最佳策略后，**计算最优策略用约4倍少的计算量就能接近或超过best-of-N的表现**（如16次生成 vs 64次生成）。

#### 6. 通过修订提议分布扩展测试时计算

##### 6.1 修订模型训练

论文微调LLM使其能够迭代修订答案。训练数据的构造方式：

1. 对每个问题并行采样64个回答
2. 事后将这些独立样本组装成多轮轨迹：最多4个错误答案 + 1个正确答案
3. 选择与正确答案编辑距离最近的错误答案作为上下文中最后一个错误答案，以增强相关性
4. 在这些轨迹上对基础模型做SFT

**推理时使用：** 虽然训练时最多4个前置答案，但推理时可以通过截断上下文到最近4个修订来生成更长的链。一个问题是分布偏移：训练时上下文中只有错误答案，但推理时模型可能采样到正确答案，导致约38%的正确答案被"修订"为错误答案。因此需要用多数投票或验证者来从修订序列中选择最佳答案。

##### 6.2 修订结果分析

**顺序 vs 并行（Figure 9右）：** 顺序修订（N次修订串行）略优于并行采样（N个独立答案），无论用验证者还是多数投票。  
**顺序与并行的权衡（Figure 7）：**

- 并行采样相当于全局搜索，覆盖多种解题策略
- 顺序修订相当于局部精炼
- 在给定预算下，存在一个最优的顺序/并行比例
- **这个最优比例依赖于问题难度：** 简单问题从纯顺序修订中获益最多；困难问题需要在顺序和并行之间取得平衡

**计算最优修订（Figure 6）：** 根据难度bin选择最优的顺序/并行比例后，计算最优策略用约4倍少的计算量就能超过best-of-N基线（如64次采样 vs 256次）。

#### 7. 预训练计算与测试时计算的交换

这是论文最具实际意义的分析之一。核心问题是：**如果要提升性能，应该把额外的FLOPs花在扩大预训练模型上，还是花在小模型的测试时计算上？**

##### FLOPs匹配方法

- 预训练FLOPs：$X = 6ND_{\text{pretrain}}$
- 推理FLOPs：$Y = 4ND_{\text{inference}}$（乘以2是为了考虑验证者的开销）
- 如果将模型参数扩大$M$倍，预训练和推理FLOPs都增加$M$倍，总共 $M(X+Y)$ FLOPs
- 为了匹配FLOPs，小模型的推理计算需要乘以 $M + \frac{3}{2}(D_{\text{pre}}/D_{\text{inf}})(M-1)$  
  关键变量是比率 $R = D_{\text{inf}}/D_{\text{pre}}$：
- $R \ll 1$：推理token远少于预训练token（如自我改进流程）
- $R \gg 1$：推理token远多于预训练token（如大规模生产部署）

##### 实验结果（Figure 8）

论文将计算最优的测试时扩展（使用PaLM 2-S\*）与参数扩大约14倍的模型进行比较：

- **简单和中等难度问题（难度1-3）：** 测试时计算通常优于扩大预训练，尤其在 $R \ll 1$ 时
- **困难问题（难度4/5）：** 扩大预训练更有效
- **$R$ 越大：** 预训练扩展越有利（因为大模型的推理成本也更高，但每次推理都更强）

**核心结论：测试时计算和预训练计算不是1对1可交换的。** 在推理需求较小或问题中等难度的场景下，测试时计算可以替代预训练；但在最困难的问题或高推理负载下，预训练仍然更有效。

#### 8. 关键技术细节补充

**PRM vs ORM（Appendix H）：** PRM始终优于ORM，且随着样本数增加，差距扩大。有趣的是，当使用"最后一步"聚合时，PRM实际上被当作ORM使用，但仍优于直接训练的ORM，说明逐步训练可能主要起到了表示学习的作用。  
**验证者质量的影响（Appendix K）：** 即使使用较弱的验证者（如加了20%噪声的PRM），在简单/中等问题和低推理负载下，测试时计算仍可优于扩大预训练。甚至不用验证者、仅用修订模型+多数投票，也能在简单和中等问题上超过扩大模型参数。  
**ReST$^{EM}$优化修订模型（Appendix P）：** 尝试用RL进一步优化修订模型，但发现在线数据加剧了虚假相关性，导致优化后的模型反而无法有效修订。

#### 9. 局限性与未来方向

- Lookahead search表现不佳，可能需要在线MCTS训练的PRM
- 难度估计需要大量计算（2048个样本），需要更高效的方法
- 结论是否能推广到数学以外的领域尚不清楚
- 未来可以将测试时计算的输出蒸馏回基础模型，形成迭代自我改进循环
- 需要研究预训练规模与测试时计算扩展之间的交互关系

#### 10. 后续验证

论文提交后，Beeching et al. 和 Liu et al. (2025) 使用开源模型（LLaMA、Qwen）和其他数学基准（AIME-2024）独立复现了主要发现。OpenAI o1/o3和DeepSeek R1模型也证明了训练模型输出扩展的思维链（类似于论文研究的迭代修订方法）是实现测试时扩展的高效方式。

## 研究要点表

| 维度 | 内容 |
| --- | --- |
| 论文标题 | Scaling LLM Test-Time Compute Optimally Can Be More Effective Than Scaling Parameters for Reasoning |
| 作者 | Charlie Snell, Jaehoon Lee, Kelvin Xu, Aviral Kumar |
| 发表年份 | 2025（发表于ICLR 2025） |
| 研究问题 | 在给定固定但非平凡的推理时计算量条件下，LLM能在多大程度上提升其在具有挑战性的提示上的表现？如何最优地分配测试时计算资源，以及测试时计算与预训练计算之间如何权衡？ |
| 研究方法 | 分析两种扩展测试时计算的主要机制：（1）基于过程奖励模型（PRM）验证器的搜索（包括best-of-N、束搜索、前瞻搜索）；（2）通过迭代修订自适应地更新模型的响应分布。在MATH基准上使用PaLM 2-S\*模型进行实验，并提出基于问题难度的"计算最优"缩放策略。 |
| 主要发现 | 不同测试时计算方法的有效性取决于问题难度：简单问题更适合顺序修订，困难问题更适合并行采样或树搜索。通过计算最优策略，测试时计算效率比best-of-N基线提升4倍以上。在FLOPs匹配评估中，对于中等难度问题，小模型加测试时计算可超越14倍大的模型。 |
| 创新点 | 提出了基于问题难度的自适应"计算最优"测试时缩放策略，将测试时计算方法统一为提议分布修改和验证器优化两个维度，并首次系统性地在FLOPs匹配条件下比较了测试时计算与预训练计算的权衡关系。 |
| 局限性 | 前瞻搜索表现不佳，可能需要在线MCTS训练来优化；难度估计需要大量计算开销；研究结论是否能推广到数学以外的领域尚不清楚；对于最困难的问题，测试时计算的收益有限，无法与预训练计算1对1互换。 |
| 与本研究的关联 | 未提及 |

## 原文摘要

Enabling LLMs to improve their outputs by using more test-time compute is a critical step towards building self-improving agents that can operate on open-ended natural language. In this paper, we scale up inference-time computation in LLMs, with a focus on answering: if an LLM is allowed to use a fixed but non-trivial amount of inference-time compute, how much can it improve its performance on a challenging prompt? Answering this question has implications not only on performance, but also on the future of LLM pretraining and how to tradeoff inferencetime and pre-training compute. Little research has attempted to understand the scaling behaviors of test-time inference methods, with current work largely providing negative results for a number of these strategies. In this work, we analyze two primary mechanisms to scale test-time computation: (1) searching against dense, process-based verifier reward models (PRMs); and (2) updating the model’s distribution over a response adaptively, given the prompt at test time. We find that in both cases, the effectiveness of different approaches to scaling test-time compute critically varies depending on the difficulty of the prompt. This observation motivates applying a “compute-optimal” scaling strategy, which acts to, as effectively as possible, allocate test-time compute per prompt in an adaptive manner. Using this compute-optimal strategy, we can improve the efficiency of test-time compute scaling for math reasoning problems by more than 4× compared to a best-of-N baseline. Additionally, in a FLOPs-matched evaluation, we find that on problems where a smaller base model attains somewhat non-trivial success rates, test-time compute can be used to outperform a 14× larger model.
