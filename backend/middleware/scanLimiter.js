/**
 * ============================================================
 * AI SCAN LIMITER MIDDLEWARE
 * Enforces freemium scan limits based on subscription tier
 * ============================================================
 */

const SCAN_LIMITS = {
  free: 2,
  pro: 50,
  unlimited: Infinity,
};

/**
 * Check if user can perform an AI scan
 * Returns remaining scans or blocks request if limit exceeded
 */
export const checkScanLimit = async (req, res, next) => {
  try {
    // If no authenticated user, treat as free tier with session-based limiting
    if (!req.user) {
      // For anonymous users, we'll be more restrictive
      // They should sign up to use AI features
      return res.status(401).json({
        error: 'Authentication Required',
        message: 'Please sign in to use AI scanning features',
        code: 'AUTH_REQUIRED',
      });
    }

    const userId = req.user.id;

    // Get user's subscription tier
    const { data: profile, error: profileError } = await req.supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Default to free tier if profile fetch fails
    }

    // Determine effective tier
    let tier = 'free';
    if (profile) {
      const isSubscriptionActive = 
        profile.subscription_status === 'active' &&
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());
      
      tier = isSubscriptionActive ? (profile.subscription_tier || 'free') : 'free';
    }

    const scanLimit = SCAN_LIMITS[tier] || SCAN_LIMITS.free;

    // Get current month's scan count
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count, error: countError } = await req.supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    if (countError) {
      console.error('Error counting scans:', countError);
    }

    const currentUsage = count || 0;
    const remainingScans = Math.max(0, scanLimit - currentUsage);

    // Check if limit exceeded
    if (currentUsage >= scanLimit && tier !== 'unlimited') {
      return res.status(403).json({
        error: 'Scan Limit Reached',
        message: `You've used all ${scanLimit} AI scans for this month. Upgrade to Pro for more scans!`,
        code: 'SCAN_LIMIT_EXCEEDED',
        usage: {
          current: currentUsage,
          limit: scanLimit,
          remaining: 0,
          tier: tier,
          resetsAt: getNextMonthStart(),
        },
        upgrade: {
          pro: { price: 4.99, scans: 50 },
          unlimited: { price: 9.99, scans: 'Unlimited' },
        },
      });
    }

    // Attach usage info to request for later use
    req.scanUsage = {
      current: currentUsage,
      limit: scanLimit,
      remaining: remainingScans - 1, // -1 because this scan will be used
      tier: tier,
    };

    next();
  } catch (error) {
    console.error('Scan limiter error:', error);
    // On error, allow the request but log it
    next();
  }
};

/**
 * Record a successful AI scan
 */
export const recordScan = async (req, scanType, metadata = {}) => {
  if (!req.user || !req.supabase) return;

  try {
    const { data, error } = await req.supabase
      .from('ai_usage')
      .insert({
        user_id: req.user.id,
        scan_type: scanType,
        metadata: metadata,
      })
      .select();

    if (error) {
      console.error('Error recording scan:', error);
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    } else {
      console.log('✅ Scan recorded successfully:', data);
    }
  } catch (error) {
    console.error('Exception recording scan:', error);
  }
};

/**
 * Get the start of next month (when limits reset)
 */
function getNextMonthStart() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

export default { checkScanLimit, recordScan };

