import CustomHabitTransformerNode from './CustomHabitTransformerNode';

export function registerCustomNodes(factory: any) {
  factory.registerNodeType('custom.habit-transformer', CustomHabitTransformerNode);

  /* INJECT_CUSTOM_NODES */
}
