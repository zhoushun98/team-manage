"""
认证依赖
用于保护需要认证的路由
"""
import logging
from fastapi import Request, HTTPException, status

logger = logging.getLogger(__name__)


def get_current_user(request: Request) -> dict:
    """
    获取当前登录用户
    从 Session 中获取用户信息

    Args:
        request: FastAPI Request 对象

    Returns:
        用户信息字典

    Raises:
        HTTPException: 如果未登录
    """
    user = request.session.get("user")

    if not user:
        logger.warning("未登录用户尝试访问受保护资源")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="未登录"
        )

    return user


def _get_session_admin(request: Request) -> dict | None:
    """
    Return admin user from session if present.
    """
    user = request.session.get("user")
    if user and user.get("is_admin"):
        return user
    return None


async def require_admin(request: Request) -> dict:
    """
    Require admin session authentication only.
    """
    user = _get_session_admin(request)
    if user:
        return user

    logger.warning("认证失败: 需要管理员 Session")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="需要管理员登录"
    )


async def require_team_import_access(request: Request) -> dict:
    """
    Authorize team import access.
    Accepts admin session or import-scoped X-API-Key.
    """
    user = _get_session_admin(request)
    if user:
        return user

    api_key_header = request.headers.get("X-API-Key")
    if api_key_header:
        from app.database import AsyncSessionLocal
        from app.services.settings import settings_service

        async with AsyncSessionLocal() as db:
            api_key = await settings_service.get_setting(db, "api_key")
            if api_key and api_key_header.strip() == api_key:
                return {
                    "username": "api_import_user",
                    "is_admin": False,
                    "scopes": ["team:import"],
                    "auth_method": "api_key"
                }

    logger.warning("导入接口认证失败: 未登录且 API Key 无效")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="未登录或导入 API Key 无效"
    )


def optional_user(request: Request) -> dict | None:
    """
    可选的用户信息
    如果已登录则返回用户信息，否则返回 None

    Args:
        request: FastAPI Request 对象

    Returns:
        用户信息字典或 None
    """
    return request.session.get("user")
