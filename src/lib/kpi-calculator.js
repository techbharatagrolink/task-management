// KPI and KRI calculation service
import { query } from './db.js';

/**
 * Calculate KPI metric value based on definition
 * @param {Object} kpiDefinition - KPI definition from database
 * @param {number|null} userId - User ID (null for team-level)
 * @param {string|null} department - Department name (null for user-level)
 * @param {Object} period - Period object with start, end, and type
 * @returns {Promise<number>} Calculated metric value
 */
export async function calculateKPIMetric(kpiDefinition, userId, department, period) {
  const { code, calculation_formula } = kpiDefinition;
  const formula = typeof calculation_formula === 'string' 
    ? JSON.parse(calculation_formula) 
    : calculation_formula;
  
  const { type } = formula;
  const { start, end } = period;

  switch (type) {
    case 'task_completion_rate':
      return await calculateTaskCompletionRate(userId, department, start, end);
    
    case 'ontime_delivery':
      return await calculateOnTimeDelivery(userId, department, start, end);
    
    case 'avg_task_rating':
      return await calculateAvgTaskRating(userId, department, start, end);
    
    case 'tasks_completed':
      return await calculateTasksCompleted(userId, department, start, end);
    
    case 'attendance_rate':
      return await calculateAttendanceRate(userId, department, start, end);
    
    default:
      throw new Error(`Unknown KPI calculation type: ${type}`);
  }
}

/**
 * Calculate KRI metric value and risk level based on definition
 * @param {Object} kriDefinition - KRI definition from database
 * @param {number|null} userId - User ID (null for team-level)
 * @param {string|null} department - Department name (null for user-level)
 * @param {Object} period - Period object with start, end, and type
 * @returns {Promise<Object>} Object with calculated_value and risk_level
 */
export async function calculateKRIMetric(kriDefinition, userId, department, period) {
  const { code, calculation_formula, threshold_warning, threshold_critical } = kriDefinition;
  const formula = typeof calculation_formula === 'string' 
    ? JSON.parse(calculation_formula) 
    : calculation_formula;
  
  const { type } = formula;
  const { start, end } = period;

  let calculatedValue;
  let riskLevel = 'low';

  switch (type) {
    case 'overdue_tasks':
      calculatedValue = await calculateOverdueTasks(userId, department);
      break;
    
    case 'tasks_at_risk':
      calculatedValue = await calculateTasksAtRisk(userId, department);
      break;
    
    case 'low_performance':
      calculatedValue = await calculateLowPerformance(userId, department, start, end);
      break;
    
    case 'high_absenteeism':
      calculatedValue = await calculateHighAbsenteeism(userId, department, start, end);
      break;
    
    default:
      throw new Error(`Unknown KRI calculation type: ${type}`);
  }

  // Determine risk level based on thresholds
  if (threshold_critical !== null && calculatedValue >= threshold_critical) {
    riskLevel = 'critical';
  } else if (threshold_warning !== null && calculatedValue >= threshold_warning) {
    riskLevel = 'high';
  } else if (threshold_warning !== null && calculatedValue >= (threshold_warning * 0.7)) {
    riskLevel = 'medium';
  }

  return {
    calculated_value: calculatedValue,
    risk_level: riskLevel
  };
}

// ===== KPI Calculation Functions =====

/**
 * Calculate task completion rate
 * Formula: (Completed tasks / Total assigned tasks) * 100
 */
async function calculateTaskCompletionRate(userId, department, startDate, endDate) {
  let sql, params;

  if (userId) {
    // User-level calculation
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed,
        COUNT(DISTINCT t.id) as total
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ta.user_id = ?
        AND t.created_at >= ? 
        AND t.created_at <= ?
    `;
    params = [userId, startDate, endDate];
  } else if (department) {
    // Department-level calculation
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed,
        COUNT(DISTINCT t.id) as total
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      INNER JOIN users u ON ta.user_id = u.id
      WHERE u.department = ?
        AND t.created_at >= ? 
        AND t.created_at <= ?
    `;
    params = [department, startDate, endDate];
  } else {
    // Organization-level
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed,
        COUNT(DISTINCT t.id) as total
      FROM tasks t
      WHERE t.created_at >= ? 
        AND t.created_at <= ?
    `;
    params = [startDate, endDate];
  }

  const result = await query(sql, params);
  const { completed = 0, total = 0 } = result[0] || {};

  if (total === 0) return 0;
  return parseFloat(((completed / total) * 100).toFixed(2));
}

/**
 * Calculate on-time delivery rate
 * Formula: (Tasks completed before deadline / Total completed tasks) * 100
 */
async function calculateOnTimeDelivery(userId, department, startDate, endDate) {
  let sql, params;

  if (userId) {
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.deadline IS NOT NULL 
          AND DATE(t.updated_at) <= DATE(t.deadline) THEN t.id END) as ontime,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.deadline IS NOT NULL THEN t.id END) as total
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ta.user_id = ?
        AND t.status = 'completed'
        AND t.updated_at >= ? 
        AND t.updated_at <= ?
    `;
    params = [userId, startDate, endDate];
  } else if (department) {
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.deadline IS NOT NULL 
          AND DATE(t.updated_at) <= DATE(t.deadline) THEN t.id END) as ontime,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.deadline IS NOT NULL THEN t.id END) as total
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      INNER JOIN users u ON ta.user_id = u.id
      WHERE u.department = ?
        AND t.status = 'completed'
        AND t.updated_at >= ? 
        AND t.updated_at <= ?
    `;
    params = [department, startDate, endDate];
  } else {
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.deadline IS NOT NULL 
          AND DATE(t.updated_at) <= DATE(t.deadline) THEN t.id END) as ontime,
        COUNT(DISTINCT CASE WHEN t.status = 'completed' AND t.deadline IS NOT NULL THEN t.id END) as total
      FROM tasks t
      WHERE t.status = 'completed'
        AND t.updated_at >= ? 
        AND t.updated_at <= ?
    `;
    params = [startDate, endDate];
  }

  const result = await query(sql, params);
  const { ontime = 0, total = 0 } = result[0] || {};

  if (total === 0) return 0;
  return parseFloat(((ontime / total) * 100).toFixed(2));
}

/**
 * Calculate average task rating
 * Formula: Average rating from task_ratings table
 */
async function calculateAvgTaskRating(userId, department, startDate, endDate) {
  let sql, params;

  if (userId) {
    sql = `
      SELECT AVG(tr.rating) as avg_rating
      FROM task_ratings tr
      INNER JOIN tasks t ON tr.task_id = t.id
      WHERE tr.user_id = ?
        AND tr.created_at >= ? 
        AND tr.created_at <= ?
    `;
    params = [userId, startDate, endDate];
  } else if (department) {
    sql = `
      SELECT AVG(tr.rating) as avg_rating
      FROM task_ratings tr
      INNER JOIN tasks t ON tr.task_id = t.id
      INNER JOIN users u ON tr.user_id = u.id
      WHERE u.department = ?
        AND tr.created_at >= ? 
        AND tr.created_at <= ?
    `;
    params = [department, startDate, endDate];
  } else {
    sql = `
      SELECT AVG(tr.rating) as avg_rating
      FROM task_ratings tr
      WHERE tr.created_at >= ? 
        AND tr.created_at <= ?
    `;
    params = [startDate, endDate];
  }

  const result = await query(sql, params);
  const avgRating = result[0]?.avg_rating || 0;
  return parseFloat(avgRating.toFixed(2));
}

/**
 * Calculate tasks completed in period
 * Formula: Count of completed tasks
 */
async function calculateTasksCompleted(userId, department, startDate, endDate) {
  let sql, params;

  if (userId) {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ta.user_id = ?
        AND t.status = 'completed'
        AND t.updated_at >= ? 
        AND t.updated_at <= ?
    `;
    params = [userId, startDate, endDate];
  } else if (department) {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      INNER JOIN users u ON ta.user_id = u.id
      WHERE u.department = ?
        AND t.status = 'completed'
        AND t.updated_at >= ? 
        AND t.updated_at <= ?
    `;
    params = [department, startDate, endDate];
  } else {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      WHERE t.status = 'completed'
        AND t.updated_at >= ? 
        AND t.updated_at <= ?
    `;
    params = [startDate, endDate];
  }

  const result = await query(sql, params);
  return parseInt(result[0]?.count || 0);
}

/**
 * Calculate attendance rate
 * Formula: (Present days / Total working days) * 100
 */
async function calculateAttendanceRate(userId, department, startDate, endDate) {
  let sql, params;

  if (userId) {
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN a.status = 'present' OR a.status = 'half_day' THEN a.date END) as present_days,
        COUNT(DISTINCT a.date) as total_days
      FROM attendance a
      WHERE a.user_id = ?
        AND a.date >= ? 
        AND a.date <= ?
    `;
    params = [userId, startDate, endDate];
  } else if (department) {
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN a.status = 'present' OR a.status = 'half_day' THEN a.date END) as present_days,
        COUNT(DISTINCT a.date) as total_days
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE u.department = ?
        AND a.date >= ? 
        AND a.date <= ?
    `;
    params = [department, startDate, endDate];
  } else {
    sql = `
      SELECT 
        COUNT(DISTINCT CASE WHEN a.status = 'present' OR a.status = 'half_day' THEN a.date END) as present_days,
        COUNT(DISTINCT a.date) as total_days
      FROM attendance a
      WHERE a.date >= ? 
        AND a.date <= ?
    `;
    params = [startDate, endDate];
  }

  const result = await query(sql, params);
  const { present_days = 0, total_days = 0 } = result[0] || {};

  if (total_days === 0) return 0;
  return parseFloat(((present_days / total_days) * 100).toFixed(2));
}

// ===== KRI Calculation Functions =====

/**
 * Calculate overdue tasks count
 * Formula: Count of tasks with deadline < today and status != 'completed'
 */
async function calculateOverdueTasks(userId, department) {
  const today = new Date().toISOString().split('T')[0];
  let sql, params;

  if (userId) {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ta.user_id = ?
        AND t.deadline IS NOT NULL
        AND DATE(t.deadline) < ?
        AND t.status != 'completed'
        AND t.status != 'cancelled'
    `;
    params = [userId, today];
  } else if (department) {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      INNER JOIN users u ON ta.user_id = u.id
      WHERE u.department = ?
        AND t.deadline IS NOT NULL
        AND DATE(t.deadline) < ?
        AND t.status != 'completed'
        AND t.status != 'cancelled'
    `;
    params = [department, today];
  } else {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      WHERE t.deadline IS NOT NULL
        AND DATE(t.deadline) < ?
        AND t.status != 'completed'
        AND t.status != 'cancelled'
    `;
    params = [today];
  }

  const result = await query(sql, params);
  return parseInt(result[0]?.count || 0);
}

/**
 * Calculate tasks at risk (due within 2 days)
 * Formula: Count of tasks due within 2 days and status != 'completed'
 */
async function calculateTasksAtRisk(userId, department) {
  const today = new Date();
  const twoDaysLater = new Date(today);
  twoDaysLater.setDate(today.getDate() + 2);
  
  const todayStr = today.toISOString().split('T')[0];
  const twoDaysLaterStr = twoDaysLater.toISOString().split('T')[0];
  
  let sql, params;

  if (userId) {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      WHERE ta.user_id = ?
        AND t.deadline IS NOT NULL
        AND DATE(t.deadline) >= ?
        AND DATE(t.deadline) <= ?
        AND t.status != 'completed'
        AND t.status != 'cancelled'
    `;
    params = [userId, todayStr, twoDaysLaterStr];
  } else if (department) {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      INNER JOIN task_assignments ta ON t.id = ta.task_id
      INNER JOIN users u ON ta.user_id = u.id
      WHERE u.department = ?
        AND t.deadline IS NOT NULL
        AND DATE(t.deadline) >= ?
        AND DATE(t.deadline) <= ?
        AND t.status != 'completed'
        AND t.status != 'cancelled'
    `;
    params = [department, todayStr, twoDaysLaterStr];
  } else {
    sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tasks t
      WHERE t.deadline IS NOT NULL
        AND DATE(t.deadline) >= ?
        AND DATE(t.deadline) <= ?
        AND t.status != 'completed'
        AND t.status != 'cancelled'
    `;
    params = [todayStr, twoDaysLaterStr];
  }

  const result = await query(sql, params);
  return parseInt(result[0]?.count || 0);
}

/**
 * Calculate low performance indicator
 * Formula: Task completion rate < threshold
 */
async function calculateLowPerformance(userId, department, startDate, endDate) {
  const completionRate = await calculateTaskCompletionRate(userId, department, startDate, endDate);
  // Return 100 - completion rate as indicator (higher = worse performance)
  return parseFloat((100 - completionRate).toFixed(2));
}

/**
 * Calculate high absenteeism indicator
 * Formula: 100 - attendance rate (higher = worse attendance)
 */
async function calculateHighAbsenteeism(userId, department, startDate, endDate) {
  const attendanceRate = await calculateAttendanceRate(userId, department, startDate, endDate);
  // Return 100 - attendance rate as indicator (higher = worse attendance)
  return parseFloat((100 - attendanceRate).toFixed(2));
}

