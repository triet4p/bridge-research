from sqlmodel import Session
from src.models.lm_setting import LMSetting

class LMSettingRepository:
    def __init__(self, session: Session):
        self.session = session

    def get(self) -> LMSetting | None:
        """Lấy setting (ID=1)"""
        return self.session.get(LMSetting, 1)

    def create(self, setting: LMSetting) -> LMSetting:
        self.session.add(setting)
        self.session.commit()
        self.session.refresh(setting)
        return setting

    def update(self, setting: LMSetting) -> LMSetting:
        self.session.add(setting)
        self.session.commit()
        self.session.refresh(setting)
        return setting