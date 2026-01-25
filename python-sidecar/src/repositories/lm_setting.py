from sqlmodel import Session
from src.models.lm_setting import LMSetting

class LMSettingRepository:
    """
    Repository for managing the singleton AI Configuration.
    """
    def __init__(self, session: Session):
        self.session = session

    def get(self) -> LMSetting | None:
        """
        Retrieves the global settings.
        
        Returns:
            (LMSetting | None): A Singleton pattern by always using ID=1.
        
        ## Note:
            We enforce a Singleton pattern by always using ID=1.
        """
        return self.session.get(LMSetting, 1)

    def create(self, setting: LMSetting) -> LMSetting:
        """Creates the initial settings record."""
        self.session.add(setting)
        self.session.commit()
        self.session.refresh(setting)
        return setting

    def update(self, setting: LMSetting) -> LMSetting:
        """Updates the existing settings record."""
        self.session.add(setting)
        self.session.commit()
        self.session.refresh(setting)
        return setting