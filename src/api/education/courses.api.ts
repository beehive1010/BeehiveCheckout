// Education API functions - Using Supabase direct queries
import { supabase } from '../../lib/supabase';

export const coursesApi = {
  async getCourses() {
    try {
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
        console.error('获取课程失败:', error)
        return []
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
        console.error('获取课程访问权限失败:', error)
        return []
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
        .select('id, title, price_bcc, required_level, is_published')
        .eq('id', courseId)
        .maybeSingle()

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
        .maybeSingle()

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
          .select('bcc_transferable')
          .eq('wallet_address', walletAddress)
          .maybeSingle()

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
          grantedAt: courseAccess.access_granted_at
        }
      }
    } catch (error) {
      console.error('购买课程失败:', error);
      throw error;
    }
  },

  async updateProgress(courseId: string, progress: number, walletAddress?: string) {
    try {
      if (!walletAddress) {
        throw new Error('需要钱包地址');
      }
      
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
        .maybeSingle()

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
  }
};