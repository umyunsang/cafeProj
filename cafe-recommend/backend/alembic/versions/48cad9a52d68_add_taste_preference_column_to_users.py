"""add_taste_preference_column_to_users

Revision ID: 48cad9a52d68
Revises: eb9fafff6c34
Create Date: 2025-03-31 13:26:14.023084

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '48cad9a52d68'
down_revision: Union[str, None] = 'eb9fafff6c34'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # SQLite has limitations with ALTER TABLE
    op.add_column('users', sa.Column('taste_preference', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'taste_preference')
