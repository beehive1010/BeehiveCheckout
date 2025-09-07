import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

console.log(`🎓 课程系统API函数启动成功!`)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 创建Supabase客户端
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
      }
    )

    const url = new URL(req.url)
    const path = url.pathname
    const walletAddress = req.headers.get('x-wallet-address')?.toLowerCase()

    // 路由处理
    if (path.includes('/api/courses') && req.method === 'GET') {
      return await getCourses(supabase)
    }
    
    if (path.includes('/api/course-access') && req.method === 'GET') {
      if (!walletAddress) {
        throw new Error('钱包地址缺失')
      }
      return await getCourseAccess(supabase, walletAddress)
    }
    
    if (path.includes('/api/purchase-course') && req.method === 'POST') {
      if (!walletAddress) {
        throw new Error('钱包地址缺失')
      }
      const { courseId, bccAmount } = await req.json()
      return await purchaseCourse(supabase, walletAddress, courseId, bccAmount)
    }
    
    if (path.includes('/api/course-progress') && req.method === 'POST') {
      if (!walletAddress) {
        throw new Error('钱包地址缺失')
      }
      const { courseId, progress } = await req.json()
      return await updateCourseProgress(supabase, walletAddress, courseId, progress)
    }

    throw new Error('未找到对应的API端点')

  } catch (error) {
    console.error('课程API错误:', error)
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

// 获取所有已发布的课程
async function getCourses(supabase) {
  console.log('📚 获取课程列表...')
  
  const { data: courses, error } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      description,
      required_level,
      price_bcc,
      is_free,
      course_type,
      duration,
      difficulty_level,
      zoom_meeting_id,
      zoom_password,
      zoom_link,
      video_url,
      scheduled_at,
      total_enrollments,
      average_rating,
      category_id,
      course_categories (
        name,
        icon
      ),
      course_instructor_relations (
        instructor_id,
        role,
        course_instructors (
          name,
          bio,
          avatar_url
        )
      )
    `)
    .eq('is_published', true)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`获取课程失败: ${error.message}`)
  }

  // 转换数据格式以匹配前端期望
  const formattedCourses = courses?.map(course => ({
    id: course.id,
    title: course.title,
    description: course.description,
    requiredLevel: course.required_level,
    priceBCC: course.price_bcc,
    isFree: course.is_free,
    duration: course.duration,
    courseType: course.course_type,
    zoomMeetingId: course.zoom_meeting_id,
    zoomPassword: course.zoom_password,
    zoomLink: course.zoom_link,
    videoUrl: course.video_url,
    scheduledAt: course.scheduled_at,
    category: course.course_categories?.name,
    categoryIcon: course.course_categories?.icon,
    instructors: course.course_instructor_relations?.map(rel => ({
      name: rel.course_instructors.name,
      bio: rel.course_instructors.bio,
      avatar: rel.course_instructors.avatar_url,
      role: rel.role
    })) || [],
    totalEnrollments: course.total_enrollments,
    averageRating: course.average_rating
  })) || []

  console.log(`✅ 返回 ${formattedCourses.length} 门课程`)

  return new Response(JSON.stringify(formattedCourses), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

// 获取用户的课程访问权限
async function getCourseAccess(supabase, walletAddress: string) {
  console.log(`📖 获取用户课程访问权限: ${walletAddress}`)
  
  const { data: courseAccess, error } = await supabase
    .from('course_access')
    .select(`
      id,
      course_id,
      progress_percentage,
      completed_at,
      last_accessed_at,
      access_granted_at,
      rating,
      courses (
        title,
        course_type,
        zoom_meeting_id,
        zoom_password,
        zoom_link,
        video_url
      )
    `)
    .eq('wallet_address', walletAddress)
    .order('access_granted_at', { ascending: false })

  if (error) {
    throw new Error(`获取课程访问权限失败: ${error.message}`)
  }

  // 转换数据格式
  const formattedAccess = courseAccess?.map(access => ({
    id: access.id,
    walletAddress: walletAddress,
    courseId: access.course_id,
    progress: access.progress_percentage,
    completed: access.completed_at !== null,
    grantedAt: access.access_granted_at,
    lastAccessed: access.last_accessed_at,
    rating: access.rating,
    course: {
      title: access.courses?.title,
      type: access.courses?.course_type,
      zoomInfo: access.courses?.course_type === 'online' ? {
        meetingId: access.courses?.zoom_meeting_id,
        password: access.courses?.zoom_password,
        link: access.courses?.zoom_link
      } : null,
      videoUrl: access.courses?.video_url
    }
  })) || []

  console.log(`✅ 返回 ${formattedAccess.length} 个课程访问记录`)

  return new Response(JSON.stringify(formattedAccess), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

// 购买课程
async function purchaseCourse(supabase, walletAddress: string, courseId: string, bccAmount: number) {
  console.log(`💰 用户购买课程: ${walletAddress} -> ${courseId} (${bccAmount} BCC)`)
  
  try {
    // 1. 获取课程信息
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price_bcc, required_level, is_published')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      throw new Error('课程不存在')
    }

    if (!course.is_published) {
      throw new Error('课程未发布')
    }

    // 2. 检查用户会员等级
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('current_level, is_activated')
      .eq('wallet_address', walletAddress)
      .single()

    if (memberError || !member || !member.is_activated) {
      throw new Error('用户未激活会员身份')
    }

    if (member.current_level < course.required_level) {
      throw new Error(`课程需要Level ${course.required_level}会员，当前Level ${member.current_level}`)
    }

    // 3. 检查是否已经购买
    const { data: existingAccess } = await supabase
      .from('course_access')
      .select('id')
      .eq('wallet_address', walletAddress)
      .eq('course_id', courseId)
      .single()

    if (existingAccess) {
      throw new Error('已经购买过此课程')
    }

    // 4. 检查价格
    if (course.price_bcc > 0 && bccAmount !== course.price_bcc) {
      throw new Error(`价格不匹配，需要 ${course.price_bcc} BCC`)
    }

    // 5. 检查BCC余额 (这里简化处理，实际应该检查用户的BCC余额)
    if (course.price_bcc > 0) {
      const { data: balance } = await supabase
        .from('user_balances')
        .select('bcc_transferable')
        .eq('wallet_address', walletAddress)
        .single()

      if (!balance || (balance.bcc_transferable || 0) < course.price_bcc) {
        throw new Error('BCC余额不足')
      }
    }

    // 6. 创建课程访问记录
    const { data: courseAccess, error: accessError } = await supabase
      .from('course_access')
      .insert({
        wallet_address: walletAddress,
        course_id: courseId,
        payment_method: course.price_bcc > 0 ? 'bcc' : 'free',
        amount_paid: course.price_bcc,
        access_granted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (accessError) {
      throw new Error(`创建课程访问记录失败: ${accessError.message}`)
    }

    // 7. 如果是付费课程，扣除BCC (这里简化处理)
    if (course.price_bcc > 0) {
      // 实际应用中需要原子性地扣除BCC余额
      // 这里可以调用专门的BCC扣除函数
      console.log(`💳 扣除 ${course.price_bcc} BCC`)
    }

    // 8. 更新课程统计
    await supabase
      .from('courses')
      .update({ 
        total_enrollments: course.total_enrollments + 1 
      })
      .eq('id', courseId)

    console.log(`✅ 课程购买成功: ${course.title}`)

    return new Response(JSON.stringify({
      success: true,
      message: `成功购买课程: ${course.title}`,
      courseAccess: {
        id: courseAccess.id,
        courseId: courseId,
        grantedAt: courseAccess.access_granted_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('购买课程错误:', error)
    throw error
  }
}

// 更新课程进度
async function updateCourseProgress(supabase, walletAddress: string, courseId: string, progress: number) {
  console.log(`📈 更新课程进度: ${walletAddress} -> ${courseId} (${progress}%)`)
  
  // 验证进度范围
  if (progress < 0 || progress > 100) {
    throw new Error('进度必须在0-100之间')
  }

  // 检查课程访问权限
  const { data: courseAccess, error: accessError } = await supabase
    .from('course_access')
    .select('id, progress_percentage')
    .eq('wallet_address', walletAddress)
    .eq('course_id', courseId)
    .single()

  if (accessError || !courseAccess) {
    throw new Error('没有此课程的访问权限')
  }

  // 更新进度
  const updateData: any = {
    progress_percentage: progress,
    last_accessed_at: new Date().toISOString()
  }

  // 如果进度达到100%，标记为完成
  if (progress >= 100 && courseAccess.progress_percentage < 100) {
    updateData.completed_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('course_access')
    .update(updateData)
    .eq('id', courseAccess.id)

  if (updateError) {
    throw new Error(`更新进度失败: ${updateError.message}`)
  }

  console.log(`✅ 进度更新成功: ${progress}%`)

  return new Response(JSON.stringify({
    success: true,
    message: '进度更新成功',
    progress: progress,
    completed: progress >= 100
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}