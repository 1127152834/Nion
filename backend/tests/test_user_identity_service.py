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


def test_user_identity_service_apply_patch_updates_only_non_empty_fields(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setattr(
        "nion.user_identity.service.utcnow_z",
        lambda: "2026-04-10T09:00:00Z",
    )
    repository = UserIdentityRepository(base_dir=tmp_path)
    repository.save(
        UserIdentityProfile(
            user_name="张天成",
            preferred_address_for_user="老张",
            communication_style_preferences=["直接一点"],
            updated_at="2026-04-10T08:00:00Z",
        )
    )
    service = UserIdentityService(repository)

    updated = service.apply_patch(
        {
            "preferred_address_for_user": "大哥",
            "assistant_self_name": "小老弟",
            "communication_style_preferences": ["先给结论"],
            "user_name": "",
        }
    )

    assert updated.user_name == "张天成"
    assert updated.preferred_address_for_user == "大哥"
    assert updated.assistant_self_name == "小老弟"
    assert updated.communication_style_preferences == ["先给结论"]
    assert updated.updated_at == "2026-04-10T09:00:00Z"


def test_user_identity_service_apply_patch_returns_current_profile_for_empty_update(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setattr(
        "nion.user_identity.service.utcnow_z",
        lambda: "2026-04-10T09:00:00Z",
    )
    repository = UserIdentityRepository(base_dir=tmp_path)
    repository.save(
        UserIdentityProfile(
            user_name="张天成",
            updated_at="2026-04-10T08:00:00Z",
        )
    )
    service = UserIdentityService(repository)

    current = service.apply_patch({"user_name": "", "communication_style_preferences": []})

    assert current.user_name == "张天成"
    assert current.updated_at == "2026-04-10T08:00:00Z"
