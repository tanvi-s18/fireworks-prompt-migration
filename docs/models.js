// Picker labels for a simulated workflow, not performance recommendations.
// Current catalog reference: https://docs.fireworks.ai/guides/recommended-models
export const SOURCE_MODELS = [
  {id:'claude-sonnet-4-6',name:'Claude Sonnet 4.6',provider:'Anthropic'},
  {id:'claude-opus-4-8',name:'Claude Opus 4.8',provider:'Anthropic'},
  {id:'claude-haiku-4-5',name:'Claude Haiku 4.5',provider:'Anthropic'},
  {id:'gpt-5.5',name:'GPT-5.5',provider:'OpenAI'},
  {id:'gpt-5.5-pro',name:'GPT-5.5 Pro',provider:'OpenAI'},
  {id:'gpt-5.4-mini',name:'GPT-5.4 mini',provider:'OpenAI'},
  {id:'gpt-5.4-nano',name:'GPT-5.4 nano',provider:'OpenAI'},
];
export const TARGET_MODELS = [
  {id:'accounts/fireworks/models/kimi-k2p5',name:'Kimi K2.5'},
  {id:'accounts/fireworks/models/kimi-k3',name:'Kimi K3'},
  {id:'accounts/fireworks/models/minimax-m3',name:'MiniMax M3'},
  {id:'accounts/fireworks/models/deepseek-v4p1-flash',name:'DeepSeek V4.1 Flash'},
  {id:'accounts/fireworks/models/glm-5p3',name:'GLM 5.3'},
  {id:'accounts/fireworks/models/gpt-oss-120b',name:'GPT-OSS 120B'},
  {id:'accounts/fireworks/models/qwen3p7-plus',name:'Qwen3.7 Plus'},
  {id:'accounts/fireworks/models/qwen3-8b',name:'Qwen3 8B'},
];
