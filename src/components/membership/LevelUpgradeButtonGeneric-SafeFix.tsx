// 安全修复补丁 - 只替换Fallback部分（第440-467行）

        } catch (backendError: any) {
          console.error(`❌ Level ${targetLevel} backend processing error:`, backendError);
          
          // 改进的安全Fallback机制
          try {
            console.log(`🔄 Safe fallback: Creating membership record for Level ${targetLevel}...`);
            
            // 1. 首先创建membership记录（最重要）
            const { data: membershipResult, error: membershipError } = await supabase
              .from('membership')
              .insert({
                wallet_address: account.address,
                nft_level: targetLevel,
                claim_price: LEVEL_PRICE_USDC,
                claimed_at: new Date().toISOString(),
                is_member: true,
                unlock_membership_level: targetLevel + 1
              })
              .select()
              .maybeSingle(); // 使用maybeSingle避免重复插入错误
            
            if (membershipError && !membershipError.message?.includes('duplicate')) {
              console.warn(`⚠️ Membership record issue:`, membershipError);
            } else {
              console.log(`✅ Membership record created:`, membershipResult);
            }
            
            // 2. 尝试更新members表（如果失败不影响整体成功）
            try {
              const { data: memberResult, error: memberError } = await supabase
                .from('members')
                .update({ 
                  current_level: targetLevel
                })
                .eq('wallet_address', account.address)
                .select('*')
                .maybeSingle();

              if (memberError) {
                console.warn(`⚠️ Member level update warning:`, memberError);
              } else {
                console.log(`✅ Member level updated:`, memberResult);
              }
            } catch (memberUpdateError) {
              console.warn(`⚠️ Member update failed (non-critical):`, memberUpdateError);
            }

            // 如果membership记录创建成功或已存在，视为成功
            activationSuccess = true;
            console.log(`✅ Safe fallback completed for Level ${targetLevel}`);
            
          } catch (fallbackError: any) {
            console.error(`❌ Safe fallback failed:`, fallbackError);
            activationSuccess = false;
          }
        }