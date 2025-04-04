"""Add taste preferences to users

Revision ID: 37a311080024
Revises: f2c2dff7eeab
Create Date: 2025-03-30 21:20:26.344787

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '37a311080024'
down_revision: Union[str, None] = 'f2c2dff7eeab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('sweetness', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('sourness', sa.Float(), nullable=True))
    op.add_column('users', sa.Column('bitterness', sa.Float(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'bitterness')
    op.drop_column('users', 'sourness')
    op.drop_column('users', 'sweetness')
    # ### end Alembic commands ###
