/**
 * Rotas para gerenciamento de pacientes com validação robusta
 */
import { Router, type Request, type Response } from 'express'
import { 
  validatePaciente, 
  validateId, 
  validatePagination 
} from '../middleware/validation.js'
import { 
  createLimiter, 
  searchLimiter, 
  sensitiveLimiter 
} from '../middleware/rateLimiting.js'

const router = Router()

/**
 * Listar pacientes com paginação e busca
 * GET /api/pacientes
 */
router.get('/', 
  searchLimiter,
  validatePagination,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 10
      const search = req.query.search as string || ''
      
      // TODO: Implementar busca no Supabase
      // const { data, error, count } = await supabase
      //   .from('pacientes')
      //   .select('*', { count: 'exact' })
      //   .ilike('nome', `%${search}%`)
      //   .range((page - 1) * limit, page * limit - 1)
      //   .order('created_at', { ascending: false })
      
      res.status(200).json({
        success: true,
        data: [], // dados dos pacientes
        pagination: {
          page,
          limit,
          total: 0, // count
          totalPages: 0 // Math.ceil(count / limit)
        }
      })
    } catch (error) {
      console.error('Erro ao listar pacientes:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }
)

/**
 * Buscar paciente por ID
 * GET /api/pacientes/:id
 */
router.get('/:id',
  searchLimiter,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      
      // TODO: Implementar busca no Supabase
      // const { data, error } = await supabase
      //   .from('pacientes')
      //   .select('*')
      //   .eq('id', id)
      //   .single()
      
      // if (error || !data) {
      //   res.status(404).json({
      //     success: false,
      //     message: 'Paciente não encontrado'
      //   })
      //   return
      // }
      
      res.status(200).json({
        success: true,
        data: null // data
      })
    } catch (error) {
      console.error('Erro ao buscar paciente:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }
)

/**
 * Criar novo paciente
 * POST /api/pacientes
 */
router.post('/',
  createLimiter,
  validatePaciente,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const pacienteData = req.body
      
      // TODO: Verificar se CPF já existe
      // const { data: existingPaciente } = await supabase
      //   .from('pacientes')
      //   .select('id')
      //   .eq('cpf', pacienteData.cpf)
      //   .single()
      
      // if (existingPaciente) {
      //   res.status(409).json({
      //     success: false,
      //     message: 'CPF já cadastrado'
      //   })
      //   return
      // }
      
      // TODO: Criar paciente no Supabase
      // const { data, error } = await supabase
      //   .from('pacientes')
      //   .insert([pacienteData])
      //   .select()
      //   .single()
      
      // if (error) {
      //   throw error
      // }
      
      res.status(201).json({
        success: true,
        message: 'Paciente criado com sucesso',
        data: pacienteData // data
      })
    } catch (error) {
      console.error('Erro ao criar paciente:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }
)

/**
 * Atualizar paciente
 * PUT /api/pacientes/:id
 */
router.put('/:id',
  createLimiter,
  validateId,
  validatePaciente,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      const pacienteData = req.body
      
      // TODO: Verificar se paciente existe
      // const { data: existingPaciente } = await supabase
      //   .from('pacientes')
      //   .select('id')
      //   .eq('id', id)
      //   .single()
      
      // if (!existingPaciente) {
      //   res.status(404).json({
      //     success: false,
      //     message: 'Paciente não encontrado'
      //   })
      //   return
      // }
      
      // TODO: Verificar se CPF já existe em outro paciente
      // const { data: cpfExists } = await supabase
      //   .from('pacientes')
      //   .select('id')
      //   .eq('cpf', pacienteData.cpf)
      //   .neq('id', id)
      //   .single()
      
      // if (cpfExists) {
      //   res.status(409).json({
      //     success: false,
      //     message: 'CPF já cadastrado para outro paciente'
      //   })
      //   return
      // }
      
      // TODO: Atualizar paciente no Supabase
      // const { data, error } = await supabase
      //   .from('pacientes')
      //   .update(pacienteData)
      //   .eq('id', id)
      //   .select()
      //   .single()
      
      // if (error) {
      //   throw error
      // }
      
      res.status(200).json({
        success: true,
        message: 'Paciente atualizado com sucesso',
        data: pacienteData // data
      })
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }
)

/**
 * Deletar paciente
 * DELETE /api/pacientes/:id
 */
router.delete('/:id',
  sensitiveLimiter,
  validateId,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params
      
      // TODO: Verificar se paciente existe
      // const { data: existingPaciente } = await supabase
      //   .from('pacientes')
      //   .select('id')
      //   .eq('id', id)
      //   .single()
      
      // if (!existingPaciente) {
      //   res.status(404).json({
      //     success: false,
      //     message: 'Paciente não encontrado'
      //   })
      //   return
      // }
      
      // TODO: Verificar se paciente tem agendamentos ou prontuários
      // const { count: agendamentosCount } = await supabase
      //   .from('agendamentos')
      //   .select('*', { count: 'exact', head: true })
      //   .eq('paciente_id', id)
      
      // const { count: prontuariosCount } = await supabase
      //   .from('prontuarios')
      //   .select('*', { count: 'exact', head: true })
      //   .eq('paciente_id', id)
      
      // if ((agendamentosCount || 0) > 0 || (prontuariosCount || 0) > 0) {
      //   res.status(409).json({
      //     success: false,
      //     message: 'Não é possível deletar paciente com agendamentos ou prontuários associados'
      //   })
      //   return
      // }
      
      // TODO: Deletar paciente do Supabase
      // const { error } = await supabase
      //   .from('pacientes')
      //   .delete()
      //   .eq('id', id)
      
      // if (error) {
      //   throw error
      // }
      
      res.status(200).json({
        success: true,
        message: 'Paciente deletado com sucesso'
      })
    } catch (error) {
      console.error('Erro ao deletar paciente:', error)
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      })
    }
  }
)

export default router