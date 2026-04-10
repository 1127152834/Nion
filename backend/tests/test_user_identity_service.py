from nion.user_identity.models import UserIdentityProfile
from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService


def test_user_identity_service_stamps_updated_at_on_replace(monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        "nion.user_identity.service.utcnow_z",
        lambda: "2026-04-10T08:00:00Z",
    )
    service = UserIdentityService(UserIdentityRepository(base_dir=tmp_path))

    updated = service.replace_profile(
        UserIdentityProfile(
            user_name="张天成",
            preferred_address_for_user="大哥",
        )
    )

    assert updated.user_name == "张天成"
    assert updated.preferred_address_for_user == "大哥"
    assert updated.updated_at == "2026-04-10T08:00:00Z"


def test_user_identity_service_reads_latest_profile(tmp_path) -> None:
    repository = UserIdentityRepository(base_dir=tmp_path)
    repository.save(
        UserIdentityProfile(
            user_name="张天成",
            assistant_self_name="小老弟",
        )
    )
    service = UserIdentityService(repository)

    profile = service.get_profile()

    assert profile.user_name == "张天成"
    assert profile.assistant_self_name == "小老弟"
