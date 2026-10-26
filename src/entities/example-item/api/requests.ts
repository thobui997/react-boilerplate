import { http } from '@/shared/api'
import type { ExampleItem, ExampleItemInput } from '../model/example-item'
import type { ExampleItemDto, ExampleItemInputDto } from './dto'
import { fromExampleItemDto, toExampleItemInputDto } from './mappers'

const ENDPOINT = '/example-items'

export async function listExampleItems(signal?: AbortSignal): Promise<ExampleItem[]> {
  const { data } = await http.get<ExampleItemDto[]>(ENDPOINT, { signal })
  return data.map(fromExampleItemDto)
}

export async function createExampleItem(input: ExampleItemInput): Promise<ExampleItem> {
  const { data } = await http.post<ExampleItemDto>(ENDPOINT, toExampleItemInputDto(input))
  return fromExampleItemDto(data)
}

export async function updateExampleItem(id: string, input: ExampleItemInput): Promise<ExampleItem> {
  const body: ExampleItemInputDto = toExampleItemInputDto(input)
  const { data } = await http.put<ExampleItemDto>(`${ENDPOINT}/${encodeURIComponent(id)}`, body)
  return fromExampleItemDto(data)
}

export async function deleteExampleItem(id: string): Promise<void> {
  await http.delete(`${ENDPOINT}/${encodeURIComponent(id)}`)
}
