import { z } from 'zod'

export const RegisterBodySchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
})

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})
