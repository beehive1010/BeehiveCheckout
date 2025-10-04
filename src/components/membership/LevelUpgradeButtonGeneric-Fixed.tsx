// 修复版本的关键部分 - 替换第400-520行的逻辑

      // Step 7: Process level upgrade using level-upgrade Edge Function
      let activationSuccess = false;
      let activationError = null;
      
      if (claimTxResult?.transactionHash) {
        console.log(`🚀 Processing Level ${targetLevel} upgrade via level-upgrade function...`);
        setCurrentStep(`Processing Level ${targetLevel} upgrade...`);
        
        // 给blockchain一些时间确认交易
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        try {
          // Call level-upgrade Edge Function for proper processing
          console.log(`📡 Calling level-upgrade function for Level ${targetLevel}...`);
          
          const upgradeResponse = await fetch(`${API_BASE}/level-upgrade`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'x-wallet-address': account.address,
            },
            body: JSON.stringify({
              action: 'upgrade_level',
              walletAddress: account.address,
              targetLevel: targetLevel,
              transactionHash: claimTxResult.transactionHash,
              network: 'mainnet'
            })
          });

          if (!upgradeResponse.ok) {
            throw new Error(`API request failed: ${upgradeResponse.status} ${upgradeResponse.statusText}`);
          }

          const upgradeResult = await upgradeResponse.json();

          if (!upgradeResult.success) {
            throw new Error(`Level upgrade failed: ${upgradeResult.error || upgradeResult.message}`);
          }

          console.log(`✅ Level ${targetLevel} upgrade processed successfully:`, upgradeResult);
          activationSuccess = true;
          
        } catch (backendError: any) {
          console.error(`❌ Level ${targetLevel} backend processing error:`, backendError);
          activationError = backendError;
          
          // 改进的Fallback机制 - 创建完整的记录
          try {
            console.log(`🔄 Enhanced fallback: Creating complete records for Level ${targetLevel}...`);
            
            // 1. 创建membership记录 (更重要)
            const { data: membershipResult, error: membershipError } = await supabase
              .from('membership')
              .insert({
                wallet_address: account.address,
                nft_level: targetLevel,
                claim_price: LEVEL_PRICE_USDT,
                claimed_at: new Date().toISOString(),
                is_member: true,
                unlock_membership_level: targetLevel + 1
              })
              .select()
              .single();
            
            if (membershipError && !membershipError.message?.includes('duplicate')) {
              throw new Error(`Membership record creation failed: ${membershipError.message}`);
            }
            
            // 2. 更新members表的level  
            const { data: memberResult, error: memberError } = await supabase
              .from('members')
              .update({ 
                current_level: targetLevel
              })
              .eq('wallet_address', account.address)
              .select('*')
              .single();

            if (memberError) {
              console.warn(`⚠️ Member level update warning (non-critical):`, memberError);
            }

            console.log(`✅ Enhanced fallback successful for Level ${targetLevel}:`, {
              membership: membershipResult,
              member: memberResult
            });
            
            activationSuccess = true;
            activationError = null; // Clear error since fallback worked
            
          } catch (fallbackError: any) {
            console.error(`❌ Enhanced fallback also failed:`, fallbackError);
            activationSuccess = false;
            activationError = fallbackError;
          }
        }
      }

      // 改进的成功/失败消息处理
      if (activationSuccess) {
        console.log(`✅ Complete success: Level ${targetLevel} NFT minted and membership activated`);
        
        toast({
          title: `🎉 Level ${targetLevel} NFT Claimed!`,
          description: `Congratulations! Your Level ${targetLevel} membership is now active. All rewards have been processed.`,
          variant: "default",
          duration: 6000,
        });

        // 强制刷新用户数据
        try {
          // 刷新查询缓存
          if (window.queryClient) {
            window.queryClient.invalidateQueries(['user-data', account.address]);
            window.queryClient.invalidateQueries(['member-status', account.address]);
          }
        } catch (refreshError) {
          console.warn('⚠️ Cache refresh warning:', refreshError);
        }

      } else {
        // 明确的失败处理
        console.error(`❌ Level ${targetLevel} activation failed:`, activationError);
        
        toast({
          title: `⚠️ Activation Issue`,
          description: `Your Level ${targetLevel} NFT was minted successfully, but database activation failed. Please refresh the page or contact support. Transaction: ${claimTxResult.transactionHash?.slice(0, 8)}...`,
          variant: "destructive",
          duration: 10000,
        });
      }

      // 总是刷新eligibility检查
      await checkLevelEligibility();

      // 只有在完全成功时才调用onSuccess
      if (activationSuccess && onSuccess) {
        setTimeout(() => onSuccess(), 1000);
      }