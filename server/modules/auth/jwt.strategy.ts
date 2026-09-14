/**
 * 注意：本项目采用数据库存 token 的方案（更简单可靠），
 * 不使用 Passport/JWT Strategy。
 * 此文件保留作为占位，认证逻辑在 jwt-auth.guard.ts 中实现。
 *
 * 方案说明：
 * - 登录时生成随机 token（crypto.randomBytes），存入 app_session.session_token
 * - 请求时从 Authorization: Bearer <token> 取 token，查 session 表验证
 * - 验证条件：status='active' 且 last_active_at 在 24 小时内
 * - 验证通过后把 userId、username、role、sessionId 挂载到 req.user
 * - 天然支持单点登出、强制下线等功能
 */

export class JwtStrategyPlaceholder {
  static readonly description = 'Database-token based auth, see jwt-auth.guard.ts';
}
