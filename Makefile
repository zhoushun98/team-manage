.PHONY: dev

# 启动开发服务器
dev:
	uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8008
