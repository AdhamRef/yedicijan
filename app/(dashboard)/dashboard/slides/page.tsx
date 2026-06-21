'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Plus, Pencil, Trash2, Loader2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'react-hot-toast';

interface Slide {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  showButton: boolean;
  buttonText: string | null;
  buttonLink: string | null;
  isActive: boolean;
  order: number;
}

const SLIDE_ROW = 'SLIDE_ROW';

function DraggableSlideRow({
  slide,
  index,
  moveRow,
  onToggleActive,
  children,
}: {
  slide: Slide;
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onToggleActive: (slide: Slide) => void;
  children: React.ReactNode;
}) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: SLIDE_ROW,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: SLIDE_ROW,
    hover: (item: { index: number }) => {
      if (item.index === index) return;
      moveRow(item.index, index);
      item.index = index;
    },
  });

  return (
    <TableRow
      ref={(node) => preview(drop(node))}
      className={`${isDragging ? 'opacity-50' : ''} ${!slide.isActive ? 'bg-muted/30' : ''} hover:bg-muted/50 transition-colors`}
    >
      <TableCell className="w-12 p-2 cursor-grab active:cursor-grabbing" ref={drag}>
        <GripVertical className="w-5 h-5 text-muted-foreground mx-auto" />
      </TableCell>
      {children}
    </TableRow>
  );
}

export default function SlidesPage() {
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Slide | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchSlides = async () => {
    try {
      const res = await axios.get('/api/slides/admin');
      const items = res.data?.items ?? [];
      setSlides(Array.isArray(items) ? items.sort((a: Slide, b: Slide) => (a.order ?? 0) - (b.order ?? 0)) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlides(); }, []);

  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const next = [...slides];
    const [removed] = next.splice(dragIndex, 1);
    next.splice(hoverIndex, 0, removed);
    setSlides(next);
    setSavingOrder(true);
    axios
      .post('/api/slides/reorder', {
        slides: next.map((s, i) => ({ id: s.id, order: i })),
      })
      .then(() => {
        toast.success('تم تحديث الترتيب');
      })
      .catch(() => toast.error('فشل في حفظ الترتيب'))
      .finally(() => setSavingOrder(false));
  };

  const handleToggleActive = async (slide: Slide) => {
    setTogglingId(slide.id);
    try {
      await axios.put(`/api/slides/${slide.id}`, {
        ...slide,
        isActive: !slide.isActive,
      });
      setSlides(prev => prev.map(s => s.id === slide.id ? { ...s, isActive: !s.isActive } : s));
      toast.success(slide.isActive ? 'تم إلغاء التفعيل' : 'تم التفعيل');
    } catch (e) {
      toast.error('فشل في تحديث الحالة');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/slides/${deleteTarget.id}`);
      setSlides(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('تم الحذف');
    } catch (e) {
      toast.error('فشل الحذف');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">شرائح الهيرو</h1>
          <p className="text-muted-foreground mt-1">إدارة شرائح العرض الرئيسية</p>
        </div>
        <div className="flex items-center gap-3">
          {savingOrder && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جاري حفظ الترتيب...</span>
            </div>
          )}
          <Button onClick={() => router.push('/dashboard/slides/new')} size="lg" className="gap-2">
            <Plus className="w-5 h-5" /> إضافة شريحة
          </Button>
        </div>
      </div>

      <Card>
        <DndProvider backend={HTML5Backend}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-32">الصورة</TableHead>
                  <TableHead className="min-w-[200px]">المحتوى</TableHead>
                  <TableHead className="w-32 text-center">الحالة</TableHead>
                  <TableHead className="w-40 text-center">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slides.map((s, index) => (
                  <DraggableSlideRow
                    key={s.id}
                    slide={s}
                    index={index}
                    moveRow={moveRow}
                    onToggleActive={handleToggleActive}
                  >
                    <TableCell>
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-muted">
                        {s.image ? (
                          <img
                            src={s.image}
                            alt={s.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                            لا توجد صورة
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-md">
                        <div className="font-semibold text-base line-clamp-1">{s.title}</div>
                        {s.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {s.description}
                          </p>
                        )}
                        {s.showButton && s.buttonText && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {s.buttonText}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={s.isActive}
                          onCheckedChange={() => handleToggleActive(s)}
                          disabled={togglingId === s.id}
                        />
                        {togglingId === s.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : s.isActive ? (
                          <div className="flex items-center gap-1.5 text-green-600">
                            <Eye className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <EyeOff className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/slides/edit/${s.id}`)}
                          className="gap-1.5"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">تعديل</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(s)}
                          className="gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">حذف</span>
                        </Button>
                      </div>
                    </TableCell>
                  </DraggableSlideRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DndProvider>

        {slides.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-lg font-medium">لا توجد شرائح</p>
              <p className="text-sm mt-1">ابدأ بإضافة شريحة جديدة</p>
            </div>
            <Button onClick={() => router.push('/dashboard/slides/new')} className="gap-2 mt-4">
              <Plus className="w-4 h-4" /> إضافة شريحة
            </Button>
          </div>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الشريحة؟</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف الشريحة "{deleteTarget?.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}