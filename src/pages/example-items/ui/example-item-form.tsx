import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import type { ExampleItem } from '@/entities/example-item'
import { ApiError, HttpStatus } from '@/shared/api'
import { messages } from '@/shared/i18n'
import { fieldErrorsFromApi } from '@/shared/lib/form-errors'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { useCreateExampleItemMutation, useUpdateExampleItemMutation } from '../api/mutations'
import {
  exampleItemFormSchema,
  type ExampleItemFormValues,
} from '../model/example-item-form-schema'

interface ExampleItemFormProps {
  // Có `item` thì sửa mục đó, không có thì tạo mới.
  item?: ExampleItem
  onClose: () => void
}

const text = messages.exampleItems.form
const FIELDS = ['name', 'description'] as const satisfies readonly (keyof ExampleItemFormValues)[]

function isField(path: string): path is (typeof FIELDS)[number] {
  return (FIELDS as readonly string[]).includes(path)
}

// Form nội tuyến (không modal). Lỗi 422 theo ô từ server hiện dưới đúng ô; lỗi chung do mutation báo qua notify.
export function ExampleItemForm({ item, onClose }: ExampleItemFormProps) {
  const id = useId()
  const create = useCreateExampleItemMutation()
  const update = useUpdateExampleItemMutation()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ExampleItemFormValues>({
    resolver: zodResolver(exampleItemFormSchema),
    defaultValues: { name: item?.name ?? '', description: item?.description ?? '' },
  })

  const showServerErrors = (error: ApiError) => {
    if (error.status !== HttpStatus.UnprocessableEntity) return
    for (const { path, message } of fieldErrorsFromApi(error.errors)) {
      if (isField(path)) setError(path, { message })
    }
  }

  const save = (values: ExampleItemFormValues) => {
    const options = { onSuccess: onClose, onError: showServerErrors }
    if (item) update.mutate({ id: item.id, input: values }, options)
    else create.mutate(values, options)
  }

  const isPending = create.isPending || update.isPending

  return (
    <form onSubmit={handleSubmit(save)} noValidate className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>{text.name}</Label>
        <Input
          {...register('name')}
          id={`${id}-name`}
          type="text"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
        />
        {errors.name && (
          <p id={`${id}-name-error`} role="alert" className="text-destructive text-sm">
            {errors.name.message}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-description`}>{text.description}</Label>
        <Textarea
          {...register('description')}
          id={`${id}-description`}
          aria-invalid={errors.description ? true : undefined}
          aria-describedby={errors.description ? `${id}-description-error` : undefined}
        />
        {errors.description && (
          <p id={`${id}-description-error`} role="alert" className="text-destructive text-sm">
            {errors.description.message}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? text.saving : text.save}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          {text.cancel}
        </Button>
      </div>
    </form>
  )
}
