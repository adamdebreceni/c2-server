/// <reference path="flow.d.ts" />
/// <reference path="agent-manifest.d.ts" />

type FlowFileData = {
  attributes: {[attr: string]: string},
  content: string
}

type TriggerInfo = FlowFileData[];

type RunInput = {
  state?: ComponentKVState,
  triggers: TriggerInfo[]
}

type TriggerResult = {
  output: {[rel: string]: FlowFileData[]}
  end_state?: ComponentKVState
  processed_input: number
}

type RunResult = {
  schedule_error?: string,
  results: TriggerResult[],
  trigger_error?: string
}