interface AgentManifest {
  processors: ProcessorManifest[]
  controllerServices: ControllerServiceManifest[]
  schedulingDefaults: {
    defaultMaxConcurrentTasks?: number
    defaultRunDurationNanos?: number
    defaultSchedulingPeriodMillis?: number
    defaultSchedulingStrategy?: string
    penalizationPeriodMillis?: number
    yieldDurationMillis?: number
  }
  properties: {[name: string]: string|null}
  hash?: string,
  raw?: any
}

interface SchedulingDefaults {
  defaultMaxConcurrentTasks?: number
  defaultRunDurationNanos?: number
  defaultSchedulingPeriodMillis?: number
  defaultSchedulingStrategy?: string
  penalizationPeriodMillis?: number
  yieldDurationMillis?: number
}

interface ComponentManifest {
  artifact?: string,
  group?: string,
  version?: string,
  propertyDescriptors?: {[name: string]: PropertyDescriptor},
  supportsDynamicProperties: boolean
  supportsDynamicRelationships: boolean
  type: string
  typeDescription: string
}

type InputRequirement = "INPUT_REQUIRED" | "INPUT_ALLOWED" | "INPUT_FORBIDDEN";

interface ProcessorManifest extends ComponentManifest{
  supportedRelationships: Relationship[]
  inputRequirement: InputRequirement
  /* NEW */ inputAttributeRequirements?: AttributeDescriptor[] 
  /* NEW */ dynamicRelationshipAttributes?: AttributeDescriptor[]
}

interface Relationship {
  name: string
  description: string
  /* NEW */ outputAttributes?: AttributeDescriptor[]
}

/* NEW */ 
type AttributeDescriptor = {
  source: string[]
  condition?: AttributeExpression
} | {
  source: "DynamicProperties" | "InputAttributes"
  condition?: AttributeExpression
} | {
  source: "Property"
  value: string
  condition?: AttributeExpression
}

/* NEW */ 
type AttributeExpression = {
  kind: "Literal"
  value: string|null|boolean
} | {
  kind: "Property"
  value: string
} | {
  kind: "Equals" | "Or" | "And"
  arguments: [AttributeExpression, AttributeExpression]
} | {
  kind: "Not"
  arguments: [AttributeExpression]
}

interface PropertyDescriptor {
  allowableValues?: {displayName: string, value: string}[]
  name: string
  description: string
  required: boolean
  defaultValue?: string
  expressionLanguageScope: string
  validator?: string
}

interface ControllerServiceManifest extends ComponentManifest {}