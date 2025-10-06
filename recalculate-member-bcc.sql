-- Recalculate BCC balances for all existing members based on new BCC release logic
-- Phase 1 (1-10000): 10450 locked
-- Phase 2 (10001-30000): 5225 locked
-- Phase 3 (30001-100000): 2612.5 locked
-- Phase 4 (100001-168230): 1306.25 locked
--
-- New member: +500 BCC balance
-- Level 2: unlock 100 BCC from locked
-- Level 3: unlock 150 BCC from locked
-- Each level +50 BCC unlock amount
-- Level 19 SPECIAL: unlock 950 BCC (sequence 1) + 1000 BCC (sequence 2) = 1950 total

DO $$
DECLARE
    member_record RECORD;
    phase INT;
    total_locked DECIMAL;
    activation_bonus DECIMAL := 500;
    new_bcc_balance DECIMAL;
    new_bcc_locked DECIMAL;
    unlock_amount DECIMAL;
    total_unlocked DECIMAL;
    i INT;
BEGIN
    -- Loop through all members
    FOR member_record IN
        SELECT
            m.wallet_address,
            m.activation_sequence,
            m.current_level,
            COALESCE(ub.bcc_balance, 0) as existing_bcc_balance,
            COALESCE(ub.bcc_locked, 0) as existing_bcc_locked
        FROM members m
        LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
        ORDER BY m.activation_sequence ASC
    LOOP
        -- Determine phase based on activation rank
        IF member_record.activation_sequence <= 10000 THEN
            phase := 1;
            total_locked := 10450;
        ELSIF member_record.activation_sequence <= 30000 THEN
            phase := 2;
            total_locked := 5225;
        ELSIF member_record.activation_sequence <= 100000 THEN
            phase := 3;
            total_locked := 2612.5;
        ELSE
            phase := 4;
            total_locked := 1306.25;
        END IF;

        -- Start with activation bonus
        new_bcc_balance := activation_bonus;
        total_unlocked := 0;

        -- Calculate total unlocked based on current level
        -- Level 2-18: progressive unlock (100, 150, 200... 900)
        -- Level 19: TWO unlocks (950 + 1000 = 1950)
        FOR i IN 2..LEAST(member_record.current_level, 19) LOOP
            IF i = 19 THEN
                -- Level 19 special: first unlock 950, second unlock 1000
                unlock_amount := 950 + 1000; -- Total 1950 BCC for Level 19
            ELSE
                -- Regular levels: 50 * (level - 1)
                -- Level 2: 50 * 1 = 100
                -- Level 3: 50 * 2 = 150
                -- Level 18: 50 * 17 = 900
                unlock_amount := 50 * (i - 1);
            END IF;

            total_unlocked := total_unlocked + unlock_amount;
        END LOOP;

        -- Add unlocked amount to balance
        new_bcc_balance := new_bcc_balance + total_unlocked;

        -- Calculate remaining locked
        new_bcc_locked := GREATEST(0, total_locked - total_unlocked);

        -- Update user_balances
        UPDATE user_balances
        SET
            bcc_balance = new_bcc_balance,
            bcc_locked = new_bcc_locked
        WHERE LOWER(wallet_address) = LOWER(member_record.wallet_address);

        -- If no record exists, skip (FK constraint requires member to exist)
        -- IF NOT FOUND THEN
        --     Skipping INSERT - balance should be created by trigger
        -- END IF;

        -- Log recalculation information (using NOTICE instead of table insert due to balance_type constraints)

        -- Clear and recreate bcc_release_logs records based on current level
        DELETE FROM bcc_release_logs
        WHERE LOWER(wallet_address) = LOWER(member_record.wallet_address);

        -- Create release records for each level up to current_level
        FOR i IN 2..LEAST(member_record.current_level, 19) LOOP
            IF i = 19 THEN
                -- Level 19 has TWO unlock records
                -- First unlock: 950 BCC (sequence 1)
                INSERT INTO bcc_release_logs (
                    wallet_address,
                    from_level,
                    to_level,
                    bcc_released,
                    bcc_remaining_locked,
                    release_reason,
                    unlock_sequence
                ) VALUES (
                    LOWER(member_record.wallet_address),
                    18,
                    19,
                    950,
                    GREATEST(0, new_bcc_locked + 1000),
                    'Level 19 unlock (sequence 1)',
                    1
                );

                -- Second unlock: 1000 BCC (sequence 2)
                INSERT INTO bcc_release_logs (
                    wallet_address,
                    from_level,
                    to_level,
                    bcc_released,
                    bcc_remaining_locked,
                    release_reason,
                    unlock_sequence
                ) VALUES (
                    LOWER(member_record.wallet_address),
                    18,
                    19,
                    1000,
                    GREATEST(0, new_bcc_locked),
                    'Level 19 unlock (sequence 2)',
                    2
                );
            ELSE
                -- Regular levels: single unlock
                unlock_amount := 50 * (i - 1);

                INSERT INTO bcc_release_logs (
                    wallet_address,
                    from_level,
                    to_level,
                    bcc_released,
                    bcc_remaining_locked,
                    release_reason,
                    unlock_sequence
                ) VALUES (
                    LOWER(member_record.wallet_address),
                    i - 1,
                    i,
                    unlock_amount,
                    GREATEST(0, total_locked - total_unlocked + unlock_amount),
                    'Level ' || i || ' unlock',
                    1
                );
            END IF;
        END LOOP;

        RAISE NOTICE 'Updated %: Rank #%, Phase %, Level % -> Balance: %, Locked: %',
            member_record.wallet_address,
            member_record.activation_sequence,
            phase,
            member_record.current_level,
            new_bcc_balance,
            new_bcc_locked;

    END LOOP;

    RAISE NOTICE 'BCC recalculation complete for all members';
END $$;

-- Summary query
SELECT
    'Summary' as report_type,
    COUNT(*) as total_members,
    SUM(CASE WHEN m.activation_sequence <= 10000 THEN 1 ELSE 0 END) as phase1_members,
    SUM(CASE WHEN m.activation_sequence > 10000 AND m.activation_sequence <= 30000 THEN 1 ELSE 0 END) as phase2_members,
    SUM(CASE WHEN m.activation_sequence > 30000 AND m.activation_sequence <= 100000 THEN 1 ELSE 0 END) as phase3_members,
    SUM(CASE WHEN m.activation_sequence > 100000 THEN 1 ELSE 0 END) as phase4_members,
    SUM(ub.bcc_balance)::DECIMAL(10,2) as total_bcc_balance,
    SUM(ub.bcc_locked)::DECIMAL(10,2) as total_bcc_locked
FROM members m
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address);

-- Show sample balances by phase
SELECT
    CASE
        WHEN m.activation_sequence <= 10000 THEN 'Phase 1 (1-10000)'
        WHEN m.activation_sequence <= 30000 THEN 'Phase 2 (10001-30000)'
        WHEN m.activation_sequence <= 100000 THEN 'Phase 3 (30001-100000)'
        ELSE 'Phase 4 (100001+)'
    END as phase,
    m.current_level,
    COUNT(*) as member_count,
    AVG(ub.bcc_balance)::DECIMAL(10,2) as avg_balance,
    AVG(ub.bcc_locked)::DECIMAL(10,2) as avg_locked,
    SUM(ub.bcc_balance)::DECIMAL(10,2) as total_balance,
    SUM(ub.bcc_locked)::DECIMAL(10,2) as total_locked
FROM members m
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
GROUP BY
    CASE
        WHEN m.activation_sequence <= 10000 THEN 'Phase 1 (1-10000)'
        WHEN m.activation_sequence <= 30000 THEN 'Phase 2 (10001-30000)'
        WHEN m.activation_sequence <= 100000 THEN 'Phase 3 (30001-100000)'
        ELSE 'Phase 4 (100001+)'
    END,
    m.current_level
ORDER BY phase, m.current_level;

-- Show Level 19 members with double unlock verification
SELECT
    m.wallet_address,
    m.activation_sequence,
    m.current_level,
    ub.bcc_balance,
    ub.bcc_locked,
    COUNT(brr.id) as unlock_count,
    SUM(brr.bcc_released) as total_unlocked_from_records
FROM members m
LEFT JOIN user_balances ub ON LOWER(m.wallet_address) = LOWER(ub.wallet_address)
LEFT JOIN bcc_release_logs brr ON LOWER(m.wallet_address) = LOWER(brr.wallet_address) AND brr.to_level = 19
WHERE m.current_level >= 19
GROUP BY m.wallet_address, m.activation_sequence, m.current_level, ub.bcc_balance, ub.bcc_locked
ORDER BY m.activation_sequence;
