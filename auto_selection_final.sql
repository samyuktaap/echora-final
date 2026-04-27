-- SIMPLIFIED AUTO-SELECTION FUNCTION
-- RUN THIS IN SUPABASE SQL EDITOR

-- Drop the complex function if it exists
DROP FUNCTION IF EXISTS auto_select_applications(bigint, uuid);

-- Create a simpler version
CREATE OR REPLACE FUNCTION auto_select_applications(task_id_param bigint, ngo_id_param uuid)
RETURNS void AS $$
DECLARE
  app_record record;
  task_record record;
  volunteer_record record;
  compatibility_score integer;
  threshold integer;
BEGIN
  -- Get NGO's auto-selection threshold
  SELECT COALESCE(auto_selection_threshold, 70) INTO threshold
  FROM public.profiles
  WHERE id = ngo_id_param;

  -- Get task details
  SELECT * INTO task_record
  FROM public.ngo_tasks 
  WHERE id = task_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Process each pending application for this task
  FOR app_record IN 
    SELECT * FROM public.ngo_applications 
    WHERE task_id = task_id_param::text 
    AND status = 'pending'
    AND ngo_id = ngo_id_param
  LOOP
    -- Get volunteer details
    SELECT * INTO volunteer_record
    FROM public.profiles
    WHERE id = app_record.volunteer_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Compatibility calculation (start from 0)
    compatibility_score := 0;

    -- Skills match (50 points max)
    IF task_record.required_skills IS NOT NULL AND array_length(task_record.required_skills, 1) > 0 THEN
      DECLARE
        total_skills integer;
        matched_skills integer;
      BEGIN
        total_skills := array_length(task_record.required_skills, 1);
        matched_skills := (
          SELECT COUNT(*) 
          FROM unnest(task_record.required_skills) skill
          WHERE skill = ANY(SELECT unnest(COALESCE(volunteer_record.skills, ARRAY['']::text[])))
        );
        compatibility_score := compatibility_score + ROUND((matched_skills::float / total_skills::float) * 50);
      END;
    ELSE
      compatibility_score := compatibility_score + 25; -- No skills required
    END IF;

    -- Location match (30 points)
    IF volunteer_record.location IS NOT NULL AND task_record.location IS NOT NULL THEN
      IF LOWER(volunteer_record.location) = LOWER(task_record.location) OR
         volunteer_record.location LIKE '%' || task_record.location || '%' OR
         task_record.location LIKE '%' || volunteer_record.location || '%' THEN
        compatibility_score := compatibility_score + 30;
      END IF;
    END IF;

    -- Experience match (20 points)
    IF volunteer_record.experience IS NOT NULL AND task_record.min_experience IS NOT NULL THEN
      DECLARE
        volunteer_exp integer;
        task_exp integer;
      BEGIN
        volunteer_exp := CASE volunteer_record.experience
          WHEN 'Beginner' THEN 0
          WHEN 'Intermediate' THEN 1
          WHEN 'Expert' THEN 2
          ELSE 0
        END;
        
        task_exp := CASE task_record.min_experience
          WHEN 'Beginner' THEN 0
          WHEN 'Intermediate' THEN 1
          WHEN 'Expert' THEN 2
          ELSE 0
        END;
        
        IF volunteer_exp >= task_exp THEN
          compatibility_score := compatibility_score + 15;
        END IF;
        
        -- Points bonus (up to 5 points)
        compatibility_score := compatibility_score + LEAST((COALESCE(volunteer_record.points, 0) / 100), 5);
      END;
    END IF;

    -- Auto-approve or reject based on threshold
    IF compatibility_score >= threshold THEN
      UPDATE public.ngo_applications 
      SET status = 'approved' 
      WHERE id = app_record.id;
      
      -- Send notification to volunteer
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        app_record.volunteer_id,
        'application_approved',
        'Application Approved by NGO! 🎉',
        'Congratulations! Your application has been automatically approved with a compatibility score of ' || compatibility_score || '%. The NGO has selected you for this opportunity.',
        app_record.volunteer_id
      );
    ELSE
      UPDATE public.ngo_applications 
      SET status = 'rejected' 
      WHERE id = app_record.id;
      
      -- Send notification to volunteer
      INSERT INTO public.notifications (user_id, type, title, message, related_id)
      VALUES (
        app_record.volunteer_id,
        'application_rejected',
        'Application Not Selected',
        'Your application was not selected with a compatibility score of ' || compatibility_score || '% (threshold: ' || threshold || '%). Keep applying to other opportunities!',
        app_record.volunteer_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Show success
SELECT 'Simplified auto-selection function created successfully' as result;