// Education API functions - Using Supabase direct queries
import { supabase } from '../../lib/supabase';

export const coursesApi = {
  async getCourses(language = 'en', userLevel?: number) {
    try {
      console.log('📚 获取课程列表...')
      
      // 根据用户等级获取可访问的课程
      let query = supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          required_level,
          price_bcc,
          price_usdt,
          category,
          difficulty_level,
          duration_hours,
          instructor_name,
          instructor_wallet,
          is_active,
          image_url,
          metadata,
          course_type,
          course_translations (
            language_code,
            title,
            description
          )
        `)
        .eq('is_active', true)
        .order('required_level', { ascending: true })
        .order('created_at', { ascending: false })
      
      // 如果提供了用户等级，只显示用户可以访问的课程
      if (userLevel !== undefined) {
        query = query.lte('required_level', userLevel)
      }
      
      const { data: courses, error } = await query

      if (error) {
        console.error('获取课程失败:', error)
        return []
      }

      // 转换数据格式以匹配前端期望
      const formattedCourses = courses?.map(course => {
        const translation = course.course_translations?.find(t => t.language_code === language);
        const canAccess = userLevel === undefined || course.required_level <= userLevel;
        
        return {
          id: course.id,
          title: translation?.title || course.title,
          description: translation?.description || course.description,
          requiredLevel: course.required_level,
          priceBCC: course.price_bcc || 0,
          priceUSDT: course.price_usdt || 0,
          isFree: (course.price_bcc || 0) === 0,
          duration: course.duration_hours || 1,
          courseType: course.course_type || 'video',
          category: course.category,
          categoryIcon: course.course_type === 'online' ? '🎥' : '📚',
          instructors: [{
            name: course.instructor_name || 'Unknown Instructor',
            bio: 'Course instructor',
            avatar: null,
            role: 'primary',
            wallet: course.instructor_wallet
          }],
          difficultyLevel: course.difficulty_level,
          imageUrl: course.image_url,
          metadata: course.metadata,
          totalEnrollments: 0, // Will calculate later
          averageRating: 0, // Will calculate later
          canAccess: canAccess, // 用户是否可以访问此课程
          levelLocked: !canAccess // 是否因等级限制被锁定
        };
      }) || []

      console.log(`✅ 返回 ${formattedCourses.length} 门课程`)
      return formattedCourses
    } catch (error) {
      console.error('获取课程列表失败:', error);
      return [];
    }
  },

  async getCourseAccess(walletAddress: string) {
    try {
      console.log(`📖 获取用户课程访问权限: ${walletAddress}`)
      
      const { data: courseAccess, error } = await supabase
        .from('course_activations')
        .select(`
          id,
          course_id,
          progress_percentage,
          completed_at,
          activated_at,
          expires_at,
          activation_type,
          metadata,
          courses (
            title,
            category,
            image_url,
            instructor_name
          )
        `)
        .eq('wallet_address', walletAddress)
        .order('activated_at', { ascending: false })

      if (error) {
        console.error('获取课程访问权限失败:', error)
        return []
      }

      // 转换数据格式
      const formattedAccess = courseAccess?.map(access => ({
        id: access.id,
        walletAddress: walletAddress,
        courseId: access.course_id,
        progress: access.progress_percentage || 0,
        completed: access.completed_at !== null,
        grantedAt: access.activated_at,
        expiresAt: access.expires_at,
        activationType: access.activation_type,
        rating: null, // Not in current schema
        course: {
          title: access.courses?.title,
          type: 'online', // Default type
          category: access.courses?.category,
          instructor: access.courses?.instructor_name,
          imageUrl: access.courses?.image_url,
          zoomInfo: null // Not available in current schema
        },
        metadata: access.metadata
      })) || []

      console.log(`✅ 返回 ${formattedAccess.length} 个课程访问记录`)
      return formattedAccess
    } catch (error) {
      console.error('获取课程访问权限失败:', error);
      return [];
    }
  },

  async purchaseCourse(courseId: string, bccAmount: number, walletAddress?: string) {
    try {
      if (!walletAddress) {
        throw new Error('需要钱包地址');
      }
      
      console.log(`💰 用户购买课程: ${walletAddress} -> ${courseId} (${bccAmount} BCC)`)
      
      // 1. 获取课程信息
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title, price_bcc, price_usdt, required_level, is_active')
        .eq('id', courseId)
        .maybeSingle()

      if (courseError || !course) {
        throw new Error('课程不存在')
      }

      if (!course.is_active) {
        throw new Error('课程未发布')
      }

      // 2. 检查用户会员等级
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('current_level')
        .eq('wallet_address', walletAddress)
        .maybeSingle()

      if (memberError || !member) {
        throw new Error('用户未激活会员身份')
      }

      if (member.current_level < course.required_level) {
        throw new Error(`课程需要Level ${course.required_level}会员，当前Level ${member.current_level}`)
      }

      // 3. 检查是否已经购买
      const { data: existingAccess } = await supabase
        .from('course_activations')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('course_id', courseId)
        .maybeSingle()

      if (existingAccess) {
        throw new Error('已经购买过此课程')
      }

      // 4. 检查价格
      if (course.price_bcc > 0 && bccAmount !== course.price_bcc) {
        throw new Error(`价格不匹配，需要 ${course.price_bcc} BCC`)
      }

      // 5. 检查BCC余额
      if (course.price_bcc > 0) {
        const { data: balance } = await supabase
          .from('user_balances')
          .select('bcc_balance')
          .eq('wallet_address', walletAddress)
          .maybeSingle()

        if (!balance || (balance.bcc_balance || 0) < course.price_bcc) {
          throw new Error(`BCC余额不足，需要 ${course.price_bcc} BCC，当前余额 ${balance?.bcc_balance || 0} BCC`)
        }
      }

      // 6. 扣除BCC（如果需要）
      if (course.price_bcc > 0) {
        const { data: spendResult, error: spendError } = await supabase
          .rpc('spend_bcc_tokens', {
            p_wallet_address: walletAddress,
            p_amount: course.price_bcc,
            p_purpose: 'course_purchase',
            p_item_reference: courseId
          })

        if (spendError || !spendResult?.success) {
          throw new Error(`BCC扣除失败: ${spendError?.message || spendResult?.error || '未知错误'}`)
        }
      }

      // 7. 创建课程激活记录
      const { data: courseAccess, error: accessError } = await supabase
        .from('course_activations')
        .insert({
          wallet_address: walletAddress,
          course_id: courseId,
          activation_type: course.price_bcc > 0 ? 'purchase' : 'free',
          activated_at: new Date().toISOString(),
          progress_percentage: 0,
          metadata: {
            payment_method: course.price_bcc > 0 ? 'bcc' : 'free',
            amount_paid_bcc: course.price_bcc || 0,
            amount_paid_usdt: course.price_usdt || 0
          }
        })
        .select()
        .maybeSingle()

      if (accessError) {
        throw new Error(`创建课程访问记录失败: ${accessError.message}`)
      }

      console.log(`✅ 课程购买成功: ${course.title}`)

      return {
        success: true,
        message: `成功购买课程: ${course.title}`,
        courseAccess: {
          id: courseAccess.id,
          courseId: courseId,
          grantedAt: courseAccess.activated_at
        }
      }
    } catch (error) {
      console.error('购买课程失败:', error);
      throw error;
    }
  },

  async updateProgress(courseId: string, progress: number, walletAddress?: string, lessonId?: string) {
    try {
      if (!walletAddress) {
        throw new Error('需要钱包地址');
      }
      
      console.log(`📈 更新课程进度: ${walletAddress} -> ${courseId} (${progress}%)`)
      
      // 验证进度范围
      if (progress < 0 || progress > 100) {
        throw new Error('进度必须在0-100之间')
      }

      // 检查课程激活状态
      const { data: courseAccess, error: accessError } = await supabase
        .from('course_activations')
        .select('id, progress_percentage')
        .eq('wallet_address', walletAddress)
        .eq('course_id', courseId)
        .maybeSingle()

      if (accessError || !courseAccess) {
        throw new Error('没有此课程的激活记录')
      }

      // 如果提供了lessonId，更新具体lesson的进度
      if (lessonId) {
        const { error: lessonProgressError } = await supabase
          .from('course_progress')
          .upsert({
            wallet_address: walletAddress,
            course_id: courseId,
            lesson_id: lessonId,
            completed: progress >= 100,
            time_spent_minutes: Math.floor(progress / 100 * 60), // 估算时间
            last_accessed_at: new Date().toISOString(),
            completed_at: progress >= 100 ? new Date().toISOString() : null,
            overall_progress_percentage: progress
          })

        if (lessonProgressError) {
          console.error('更新lesson进度失败:', lessonProgressError)
        }
      }

      // 更新课程整体进度
      const updateData: any = {
        progress_percentage: progress
      }

      // 如果进度达到100%，标记为完成
      if (progress >= 100 && (courseAccess.progress_percentage || 0) < 100) {
        updateData.completed_at = new Date().toISOString()
      }

      const { error: updateError } = await supabase
        .from('course_activations')
        .update(updateData)
        .eq('id', courseAccess.id)

      if (updateError) {
        throw new Error(`更新进度失败: ${updateError.message}`)
      }

      console.log(`✅ 进度更新成功: ${progress}%`)

      return {
        success: true,
        message: '进度更新成功',
        progress: progress,
        completed: progress >= 100
      }
    } catch (error) {
      console.error('更新进度失败:', error);
      throw error;
    }
  },

  // 获取课程lessons（支持多语言）
  async getCourseLessons(courseId: string, language = 'en', walletAddress?: string) {
    try {
      console.log(`📚 获取课程lessons: ${courseId} (${language})`)
      
      const { data: lessons, error } = await supabase
        .from('course_lessons')
        .select(`
          id,
          title,
          description,
          lesson_order,
          content_type,
          content_url,
          duration_minutes,
          is_free,
          metadata,
          lesson_translations (
            language_code,
            title,
            description
          )
        `)
        .eq('course_id', courseId)
        .order('lesson_order', { ascending: true })

      if (error) {
        console.error('获取lessons失败:', error)
        return []
      }

      // 检查用户是否有课程访问权限
      let hasAccess = false
      if (walletAddress) {
        const { data: activation } = await supabase
          .from('course_activations')
          .select('id')
          .eq('wallet_address', walletAddress)
          .eq('course_id', courseId)
          .maybeSingle()
        hasAccess = !!activation
      }

      const formattedLessons = lessons?.map(lesson => {
        const translation = lesson.lesson_translations?.find(t => t.language_code === language)
        const canAccess = lesson.is_free || hasAccess
        
        return {
          id: lesson.id,
          title: translation?.title || lesson.title,
          description: translation?.description || lesson.description,
          order: lesson.lesson_order,
          contentType: lesson.content_type,
          contentUrl: canAccess ? lesson.content_url : null,
          duration: lesson.duration_minutes,
          isFree: lesson.is_free,
          canAccess: canAccess,
          metadata: lesson.metadata
        }
      }) || []

      console.log(`✅ 返回 ${formattedLessons.length} 个lessons`)
      return formattedLessons
    } catch (error) {
      console.error('获取lessons失败:', error);
      return [];
    }
  },

  // 预约online课程
  async bookOnlineCourse(courseId: string, scheduledAt: string, meetingType: 'zoom' | 'voov', walletAddress?: string) {
    try {
      if (!walletAddress) {
        throw new Error('需要钱包地址');
      }
      
      console.log(`📅 预约online课程: ${courseId} -> ${scheduledAt}`)
      
      // 检查用户是否已购买课程
      const { data: activation } = await supabase
        .from('course_activations')
        .select('id')
        .eq('wallet_address', walletAddress)
        .eq('course_id', courseId)
        .maybeSingle()

      if (!activation) {
        throw new Error('需要先购买课程才能预约')
      }

      // 生成验证码
      const verificationCode = Math.random().toString(36).substr(2, 6).toUpperCase()
      
      // 生成会议信息（模拟）
      const meetingInfo = {
        url: meetingType === 'zoom' ? 'https://zoom.us/j/123456789' : 'https://meeting.tencent.com/dm/123456789',
        id: '123456789',
        password: 'course123'
      }

      const { data: booking, error } = await supabase
        .from('course_bookings')
        .insert({
          course_id: courseId,
          wallet_address: walletAddress,
          scheduled_at: scheduledAt,
          meeting_type: meetingType,
          meeting_url: meetingInfo.url,
          meeting_id: meetingInfo.id,
          meeting_password: meetingInfo.password,
          verification_code: verificationCode,
          status: 'booked'
        })
        .select()
        .maybeSingle()

      if (error) {
        throw new Error(`预约失败: ${error.message}`)
      }

      console.log(`✅ 课程预约成功: ${verificationCode}`)

      return {
        success: true,
        booking: {
          id: booking.id,
          scheduledAt: booking.scheduled_at,
          meetingType: booking.meeting_type,
          meetingUrl: booking.meeting_url,
          meetingId: booking.meeting_id,
          meetingPassword: booking.meeting_password,
          verificationCode: booking.verification_code,
          instructions: `请在会议中将昵称设置为: [username]+${verificationCode}`
        }
      }
    } catch (error) {
      console.error('预约课程失败:', error);
      throw error;
    }
  }
};