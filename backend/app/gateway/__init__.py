from .config import GatewayConfig, get_gateway_config

__all__ = ["app", "create_app", "GatewayConfig", "get_gateway_config"]


def create_app(*args, **kwargs):
    from .app import create_app as _create_app

    return _create_app(*args, **kwargs)


def __getattr__(name: str):
    if name == "app":
        from .app import app as _app

        return _app
    raise AttributeError(name)
