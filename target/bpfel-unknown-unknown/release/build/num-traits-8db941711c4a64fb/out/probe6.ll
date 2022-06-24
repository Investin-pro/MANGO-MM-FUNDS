; ModuleID = 'probe6.3d6d369e-cgu.0'
source_filename = "probe6.3d6d369e-cgu.0"
target datalayout = "e-m:e-p:64:64-i64:64-n32:64-S128"
target triple = "bpfel"

; std::f64::<impl f64>::copysign
; Function Attrs: inlinehint nounwind
define internal double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$8copysign17hc880a7ba1477cbd0E"(double %self, double %sign) unnamed_addr #0 {
start:
  %0 = alloca double, align 8
  %1 = call double @llvm.copysign.f64(double %self, double %sign)
  store double %1, double* %0, align 8
  %2 = load double, double* %0, align 8
  br label %bb1

bb1:                                              ; preds = %start
  ret double %2
}

; probe6::probe
; Function Attrs: nounwind
define void @_ZN6probe65probe17h05c2bc642e4ecbefE() unnamed_addr #1 {
start:
; call std::f64::<impl f64>::copysign
  %_1 = call double @"_ZN3std3f6421_$LT$impl$u20$f64$GT$8copysign17hc880a7ba1477cbd0E"(double 1.000000e+00, double -1.000000e+00)
  br label %bb1

bb1:                                              ; preds = %start
  ret void
}

; Function Attrs: nofree nosync nounwind readnone speculatable willreturn
declare double @llvm.copysign.f64(double, double) #2

attributes #0 = { inlinehint nounwind "target-cpu"="generic" }
attributes #1 = { nounwind "target-cpu"="generic" }
attributes #2 = { nofree nosync nounwind readnone speculatable willreturn }

!llvm.module.flags = !{!0}

!0 = !{i32 7, !"PIC Level", i32 2}
