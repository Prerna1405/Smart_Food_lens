import os
import shutil
import hashlib
from typing import List, Dict, Tuple
from datasets import load_dataset
from huggingface_hub import snapshot_download
import yaml
from PIL import Image

def md5_file(path: str) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def ensure_dirs(root: str):
    for sub in ["images/train", "images/val", "images/test", "labels/train", "labels/val", "labels/test"]:
        os.makedirs(os.path.join(root, sub), exist_ok=True)

def read_yaml(path: str) -> Dict:
    if not os.path.exists(path):
        return {}
    with open(path, "r") as f:
        return yaml.safe_load(f) or {}

def write_yaml(path: str, data: Dict):
    with open(path, "w") as f:
        yaml.safe_dump(data, f, sort_keys=False)

def read_yolo_label(path: str) -> List[Tuple[int, float, float, float, float]]:
    out = []
    if not os.path.exists(path):
        return out
    with open(path, "r") as f:
        for line in f:
            parts = line.strip().split()
            if len(parts) != 5:
                continue
            try:
                cls = int(parts[0])
                x = float(parts[1]); y = float(parts[2]); w = float(parts[3]); h = float(parts[4])
            except Exception:
                continue
            vals = [x, y, w, h]
            if all(0.0 <= v <= 1.0 for v in vals) and w > 0 and h > 0:
                out.append((cls, x, y, w, h))
    return out

def write_yolo_label(path: str, rows: List[Tuple[int, float, float, float, float]]):
    if not rows:
        return
    with open(path, "w") as f:
        for cls, x, y, w, h in rows:
            f.write(f"{cls} {x} {y} {w} {h}\n")

def build_class_index(names: List[str]) -> Dict[str, int]:
    return {n: i for i, n in enumerate(names)}

def remap_rows(rows, src_names: List[str], dst_names: List[str]) -> List[Tuple[int, float, float, float, float]]:
    src_map = build_class_index(src_names)
    dst_map = build_class_index(dst_names)
    out = []
    for cls, x, y, w, h in rows:
        src_name = src_names[cls] if 0 <= cls < len(src_names) else None
        if src_name is None:
            continue
        dst_idx = dst_map.get(src_name)
        if dst_idx is None:
            continue
        out.append((dst_idx, x, y, w, h))
    return out

def collect_existing_hashes(root: str) -> Dict[str, str]:
    hashes = {}
    for split in ["train", "val", "test"]:
        img_dir = os.path.join(root, "images", split)
        if not os.path.isdir(img_dir):
            continue
        for fname in os.listdir(img_dir):
            p = os.path.join(img_dir, fname)
            if os.path.isfile(p):
                try:
                    hashes[md5_file(p)] = p
                except Exception:
                    pass
    return hashes

def merge_from_hub(src_repo: str, dst_root: str, base_names: List[str]):
    ensure_dirs(dst_root)
    dst_yaml_path = os.path.join(dst_root, "data.yaml")
    existing = read_yaml(dst_yaml_path)
    dst_names = existing.get("names") or base_names[:]
    if not dst_names:
        dst_names = []
    src_path = snapshot_download(src_repo, repo_type="dataset")
    def find_yaml(root):
        for r, d, f in os.walk(root):
            if "data.yaml" in f:
                return os.path.join(r, "data.yaml")
        return None
    src_yaml_path = find_yaml(src_path) or os.path.join(src_path, "data.yaml")
    src_yaml = read_yaml(src_yaml_path)
    print(src_path)
    print(src_yaml)
    def find_names_any(root):
        for r, d, f in os.walk(root):
            for fn in f:
                if fn.lower().endswith(".yaml"):
                    y = read_yaml(os.path.join(r, fn))
                    if isinstance(y, dict) and y.get("names"):
                        return y.get("names")
                if fn.lower() == "classes.txt":
                    p = os.path.join(r, fn)
                    try:
                        with open(p, "r") as fh:
                            return [line.strip() for line in fh if line.strip()]
                    except Exception:
                        pass
        return []
    src_names = src_yaml.get("names") or find_names_any(src_path) or []
    for n in src_names:
        if n not in dst_names:
            dst_names.append(n)
    write_yaml(dst_yaml_path, {
        "path": dst_root.replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": len(dst_names),
        "names": dst_names
    })
    existing_hashes = collect_existing_hashes(dst_root)
    copied = False
    splits = ["train", "val", "test"]
    for split in splits:
        img_rel = src_yaml.get(split)
        if not img_rel:
            continue
        src_img_dir = img_rel
        if not os.path.isabs(src_img_dir):
            src_img_dir = os.path.join(os.path.dirname(src_yaml_path), src_img_dir)
        guess_lbl = src_img_dir.replace("\\images\\", "\\labels\\").replace("/images/", "/labels/")
        src_lbl_dir = guess_lbl
        if not os.path.isdir(src_lbl_dir):
            last = os.path.basename(src_img_dir)
            parent = os.path.dirname(src_img_dir)
            if last.lower() == "images":
                src_lbl_dir = os.path.join(parent, "labels")
        if not os.path.isdir(src_lbl_dir):
            parent2 = os.path.dirname(os.path.dirname(src_img_dir))
            split_dir = os.path.basename(os.path.dirname(src_img_dir))
            src_lbl_dir = os.path.join(parent2, split_dir, "labels")
        if not os.path.isdir(src_lbl_dir):
            base = os.path.dirname(os.path.dirname(src_img_dir))
            src_lbl_dir = os.path.join(base, "labels", split)
        if os.path.isdir(src_img_dir) and os.path.isdir(src_lbl_dir):
            for fname in os.listdir(src_img_dir):
                if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    continue
                src_img = os.path.join(src_img_dir, fname)
                base = os.path.splitext(fname)[0]
                src_lbl = os.path.join(src_lbl_dir, base + ".txt")
                if not os.path.exists(src_lbl):
                    continue
                rows = read_yolo_label(src_lbl)
                if not rows:
                    continue
                remapped = remap_rows(rows, src_names, dst_names)
                if not remapped:
                    continue
                try:
                    h = md5_file(src_img)
                except Exception:
                    continue
                if h in existing_hashes:
                    continue
                dst_img = os.path.join(dst_root, "images", split, fname)
                dst_lbl = os.path.join(dst_root, "labels", split, base + ".txt")
                i = 0
                while os.path.exists(dst_img) or os.path.exists(dst_lbl):
                    i += 1
                    new_base = f"{base}_{i}"
                    dst_img = os.path.join(dst_root, "images", split, new_base + os.path.splitext(fname)[1])
                    dst_lbl = os.path.join(dst_root, "labels", split, new_base + ".txt")
                shutil.copy2(src_img, dst_img)
                write_yolo_label(dst_lbl, remapped)
                copied = True
    if copied:
        return
    ds = load_dataset(src_repo)
    print(ds)
    try:
        print(ds[list(ds.keys())[0]][0])
    except Exception:
        pass
    all_names = set(dst_names)
    for split in ds.keys():
        dsplit = ds[split]
        for ex in dsplit:
            objs = ex.get("objects") or ex.get("annotations") or ex.get("labels") or {}
            cats = []
            if isinstance(objs, dict):
                cats = objs.get("category") or objs.get("categories") or []
            elif isinstance(objs, list):
                for o in objs:
                    if isinstance(o, dict):
                        c = o.get("category") or o.get("name") or o.get("label")
                        if c:
                            cats.append(c)
            for c in cats:
                if c not in all_names:
                    all_names.add(c)
    dst_names = list(dst_names) + [n for n in all_names if n not in dst_names]
    write_yaml(dst_yaml_path, {
        "path": dst_root.replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": len(dst_names),
        "names": dst_names
    })
    dst_map = build_class_index(dst_names)
    for split in ds.keys():
        dsplit = ds[split]
        out_split = "train" if "train" in split else "val" if "val" in split or "validation" in split else "test"
        for idx, ex in enumerate(dsplit):
            img = ex.get("image")
            if img is None:
                p = ex.get("image_path") or ex.get("filepath") or ex.get("path")
                if not p or not os.path.exists(p):
                    continue
                try:
                    im = Image.open(p).convert("RGB")
                except Exception:
                    continue
            else:
                im = img if isinstance(img, Image.Image) else None
                if im is None:
                    try:
                        im = Image.fromarray(img)
                    except Exception:
                        continue
            w, h = im.size
            objs = ex.get("objects") or ex.get("annotations") or ex.get("labels") or {}
            rows = []
            if isinstance(objs, dict):
                bboxes = objs.get("bbox") or objs.get("bboxes") or []
                cats = objs.get("category") or objs.get("categories") or []
                for bb, c in zip(bboxes, cats):
                    if isinstance(bb, (list, tuple)) and len(bb) >= 4 and c in dst_map:
                        x, y, bw, bh = bb[0], bb[1], bb[2], bb[3]
                        xc = (x + bw / 2.0) / float(w)
                        yc = (y + bh / 2.0) / float(h)
                        rw = bw / float(w)
                        rh = bh / float(h)
                        rows.append((dst_map[c], xc, yc, rw, rh))
            elif isinstance(objs, list):
                for o in objs:
                    if not isinstance(o, dict):
                        continue
                    bb = o.get("bbox") or o.get("box")
                    c = o.get("category") or o.get("name") or o.get("label")
                    if not bb or c not in dst_map:
                        continue
                    x, y, bw, bh = bb[0], bb[1], bb[2], bb[3]
                    xc = (x + bw / 2.0) / float(w)
                    yc = (y + bh / 2.0) / float(h)
                    rw = bw / float(w)
                    rh = bh / float(h)
                    rows.append((dst_map[c], xc, yc, rw, rh))
            if not rows:
                continue
            base = f"hf_{split}_{idx}"
            img_out = os.path.join(dst_root, "images", out_split, base + ".jpg")
            lbl_out = os.path.join(dst_root, "labels", out_split, base + ".txt")
            im.save(img_out, format="JPEG")
            write_yolo_label(lbl_out, rows)
    if not any(os.listdir(os.path.join(dst_root, "labels", s)) for s in ["train","val","test"]):
        label_files = []
        for r, d, f in os.walk(src_path):
            for fn in f:
                if fn.lower().endswith(".txt"):
                    label_files.append(os.path.join(r, fn))
        for lbl in label_files:
            rows = read_yolo_label(lbl)
            if not rows:
                continue
            remapped = remap_rows(rows, src_names, dst_names) if src_names else rows
            if not remapped:
                continue
            base = os.path.splitext(os.path.basename(lbl))[0]
            parts = [p.lower() for p in lbl.replace("\\","/").split("/")]
            out_split = "train"
            if "val" in parts or "validation" in parts:
                out_split = "val"
            elif "test" in parts:
                out_split = "test"
            candidates = []
            dir_lbl = os.path.dirname(lbl)
            parent = os.path.dirname(dir_lbl)
            sib = dir_lbl.replace("\\labels\\","\\images\\").replace("/labels/","/images/")
            candidates.append(sib)
            candidates.append(os.path.join(parent, "images"))
            for cand in candidates:
                if not os.path.isdir(cand):
                    continue
                img_path = None
                for ext in [".jpg",".jpeg",".png"]:
                    p = os.path.join(cand, base + ext)
                    if os.path.exists(p):
                        img_path = p
                        break
                if img_path:
                    try:
                        h = md5_file(img_path)
                    except Exception:
                        break
                    if h in existing_hashes:
                        break
                    dst_img = os.path.join(dst_root, "images", out_split, os.path.basename(img_path))
                    dst_lbl = os.path.join(dst_root, "labels", out_split, base + ".txt")
                    i = 0
                    while os.path.exists(dst_img) or os.path.exists(dst_lbl):
                        i += 1
                        new_base = f"{base}_{i}"
                        dst_img = os.path.join(dst_root, "images", out_split, new_base + os.path.splitext(img_path)[1])
                        dst_lbl = os.path.join(dst_root, "labels", out_split, new_base + ".txt")
                    shutil.copy2(img_path, dst_img)
                    write_yolo_label(dst_lbl, remapped)
                    break
    max_id = -1
    for split in ["train","val","test"]:
        lbl_dir = os.path.join(dst_root, "labels", split)
        if not os.path.isdir(lbl_dir):
            continue
        for fn in os.listdir(lbl_dir):
            if not fn.endswith(".txt"):
                continue
            for cls, x, y, w, h in read_yolo_label(os.path.join(lbl_dir, fn)):
                if cls > max_id:
                    max_id = cls
    if max_id >= 0 and len(dst_names) < max_id + 1:
        for i in range(len(dst_names), max_id + 1):
            dst_names.append(f"class_{i}")
    write_yaml(dst_yaml_path, {
        "path": dst_root.replace("\\", "/"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": len(dst_names),
        "names": dst_names
    })

def validate_dataset(root: str) -> Dict[str, int]:
    stats = {"images": 0, "labels": 0, "pairs": 0, "invalid": 0}
    for split in ["train", "val", "test"]:
        img_dir = os.path.join(root, "images", split)
        lbl_dir = os.path.join(root, "labels", split)
        if not os.path.isdir(img_dir) or not os.path.isdir(lbl_dir):
            continue
        for fname in os.listdir(img_dir):
            if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            stats["images"] += 1
            base = os.path.splitext(fname)[0]
            lbl = os.path.join(lbl_dir, base + ".txt")
            if not os.path.exists(lbl):
                stats["invalid"] += 1
                continue
            stats["labels"] += 1
            rows = read_yolo_label(lbl)
            if not rows:
                stats["invalid"] += 1
                continue
            stats["pairs"] += 1
    return stats

def main():
    dst_root = os.path.normpath(os.path.join(os.path.dirname(__file__), "dataset"))
    base_names = [
        "chapati","roti","phulka","tandoori_roti","rumali_roti",
        "plain_rice","jeera_rice","pulao","fried_rice","lemon_rice","biryani",
        "dal_tadka","chana_dal","moong_dal","masoor_dal","dal_makhani","sambar",
        "aloo_bhaji","mixed_veg_bhaji","bhindi_masala","baingan_bharta","gobi_masala",
        "paneer_butter_masala","chole_masala","rajma_curry","veg_korma","palak_paneer"
    ]
    ensure_dirs(dst_root)
    merge_from_hub("SohlHealth/sohl-multidish-yolo-dataset", dst_root, base_names)
    stats = validate_dataset(dst_root)
    print(stats)

if __name__ == "__main__":
    main()
