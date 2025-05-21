import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";

export interface Menu {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url: string | null;
}

interface MenuTableProps {
  currentMenus: Menu[];
  sortConfig: { key: keyof Menu; direction: "ascending" | "descending" } | null;
  requestSort: (key: keyof Menu) => void;
  getSortIndicator: (key: keyof Menu) => string;
  handleAvailabilityChange: (menuId: number, isAvailable: boolean) => void;
  openEditDialog: (menu: Menu) => void;
  handleDelete: (menuId: number) => void;
}

export const MenuTable = ({
  currentMenus,
  sortConfig,
  requestSort,
  getSortIndicator,
  handleAvailabilityChange,
  openEditDialog,
  handleDelete,
}: MenuTableProps) => {
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => requestSort('name')}>
                메뉴명{getSortIndicator('name')}
              </TableHead>
              <TableHead>설명</TableHead>
              <TableHead className="text-right cursor-pointer" onClick={() => requestSort('price')}>
                가격{getSortIndicator('price')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => requestSort('category')}>
                카테고리{getSortIndicator('category')}
              </TableHead>
              <TableHead className="text-center cursor-pointer" onClick={() => requestSort('is_available')}>
                판매 여부{getSortIndicator('is_available')}
              </TableHead>
              <TableHead className="text-center">이미지</TableHead>
              <TableHead className="text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentMenus && currentMenus.length > 0 ? (
              currentMenus.map(menu => (
                <TableRow key={menu.id}>
                  <TableCell className="font-medium">{menu.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{menu.description}</TableCell>
                  <TableCell className="text-right">{menu.price.toLocaleString()}원</TableCell>
                  <TableCell>
                    <Badge variant="outline">{menu.category}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={menu.is_available}
                      onCheckedChange={(checked) => handleAvailabilityChange(menu.id, checked)}
                      aria-label={menu.is_available ? "판매 중" : "판매 중지"}
                      className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-red-500 [&>span]:!bg-white"
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {menu.image_url ? (
                      <img 
                        src={menu.image_url} 
                        alt={menu.name} 
                        className="h-12 w-12 object-cover rounded-md mx-auto border" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          // default-menu.jpg는 public/static/menu_images/ 경로에 있다고 가정
                          if (target.src !== '/static/menu_images/default-menu.jpg') {
                            target.src = '/static/menu_images/default-menu.jpg';
                          }
                        }}
                      />
                    ) : (
                      <img 
                        src='/static/menu_images/default-menu.jpg' 
                        alt="기본 이미지" 
                        className="h-12 w-12 object-cover rounded-md mx-auto border opacity-50"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="icon" className="mr-2" onClick={() => openEditDialog(menu)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(menu.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  표시할 메뉴가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}; 