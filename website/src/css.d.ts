declare module "*.scss" {
  const content: { [clazz: string]: string };
  export default content;
}

declare module "*.css" {
  const content: { [clazz: string]: string };
  export default content;
}